
import { ModelOption, ExpertResult, MessageAttachment, TimeoutError } from '../../types';
import { getSynthesisPrompt } from './prompts';
import { withRetry, classifyError } from '../utils/retry';
import { generateContentStream as generateOpenAIStream } from './openaiClient';
import { logger } from '../logger';
import { DEEPTHINK_TIMEOUTS, RETRY_CONFIG } from '../../config';

const isGoogleProvider = (ai: any): boolean => {
  return ai?.models?.generateContentStream !== undefined;
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, phase: 'manager' | 'expert' | 'synthesis'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(phase, timeoutMs));
      }, timeoutMs);
    })
  ]);
};

export const streamSynthesisResponse = async (
  ai: any,
  model: ModelOption,
  query: string,
  historyContext: string,
  expertResults: ExpertResult[],
  attachments: MessageAttachment[],
  budget: number,
  signal: AbortSignal,
  onChunk: (text: string, thought: string) => void
): Promise<void> => {
  const synthesisTask = async (): Promise<void> => {
    const prompt = getSynthesisPrompt(historyContext, query, expertResults);
    const isGoogle = isGoogleProvider(ai);

  if (isGoogle) {
    const contents: any = {
      role: 'user',
      parts: [{ text: prompt }]
    };

    if (attachments.length > 0) {
      attachments.forEach(att => {
        contents.parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }

    const synthesisStream = await withRetry(
      () => ai.models.generateContentStream({
        model: model,
        contents: contents,
        config: {
          thinkingConfig: {
            thinkingBudget: budget,
            includeThoughts: true
          }
        }
      }),
      RETRY_CONFIG.API_ERROR.maxRetries,
      RETRY_CONFIG.API_ERROR.initialDelay,
      RETRY_CONFIG.API_ERROR.backoffMultiplier,
      (status) => {
        logger.info("Synthesis", `Retry attempt ${status.attempt}/${status.maxRetries}`, {
          errorType: status.errorType,
          nextRetryDelay: status.nextRetryDelay
        });
      }
    );

    try {
      for await (const chunk of (synthesisStream as any)) {
        if (signal.aborted) break;

        let chunkText = "";
        let chunkThought = "";

        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.thought) {
              chunkThought += (part.text || "");
            } else if (part.text) {
              chunkText += part.text;
            }
          }
          onChunk(chunkText, chunkThought);
        }
      }
    } catch (streamError) {
      logger.error("Synthesis", "Stream interrupted", streamError);
      throw streamError;
    }
  } else {
    let contentPayload: any = prompt;

    if (attachments.length > 0) {
      contentPayload = [
        { type: 'text', text: prompt }
      ];
      attachments.forEach(att => {
        contentPayload.push({
          type: 'image_url',
          image_url: {
            url: `data:${att.mimeType};base64,${att.data}`
          }
        });
      });
    }

    const stream = generateOpenAIStream(ai, {
      model,
      systemInstruction: undefined,
      content: contentPayload,
      temperature: 0.7,
      thinkingConfig: {
        thinkingBudget: budget,
        includeThoughts: true
      }
    });

    try {
      for await (const chunk of (stream as any)) {
        if (signal.aborted) break;

        onChunk(chunk.text, chunk.thought || '');
      }
    } catch (streamError) {
      logger.error("Synthesis", "Stream interrupted (OpenAI)", streamError);
      throw streamError;
    }
  }
  };

  try {
    await withTimeout(synthesisTask(), DEEPTHINK_TIMEOUTS.SYNTHESIS, 'synthesis');
  } catch (e) {
    if (e instanceof TimeoutError) {
      logger.error("Synthesis", `Synthesis timed out after ${DEEPTHINK_TIMEOUTS.SYNTHESIS}ms`);
      throw e;
    }
    throw e;
  }
};
