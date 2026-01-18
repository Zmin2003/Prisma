
import { ModelOption, ExpertResult, MessageAttachment, TimeoutError } from '../../types';
import { getExpertSystemInstruction } from './prompts';
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

export const streamExpertResponse = async (
  ai: any,
  model: ModelOption,
  expert: ExpertResult,
  context: string,
  attachments: MessageAttachment[],
  budget: number,
  signal: AbortSignal,
  onChunk: (text: string, thought: string) => void
): Promise<void> => {
  const streamTask = async (): Promise<void> => {
    const isGoogle = isGoogleProvider(ai);

  if (isGoogle) {
    const contents: any = {
      role: 'user',
      parts: [{ text: expert.prompt }]
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

    const streamResult = await withRetry(
      () => ai.models.generateContentStream({
        model: model,
        contents: contents,
        config: {
          systemInstruction: getExpertSystemInstruction(expert.role, expert.description, context),
          temperature: expert.temperature,
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
        logger.info("Expert", `${expert.role} retry attempt ${status.attempt}/${status.maxRetries}`, {
          errorType: status.errorType,
          nextRetryDelay: status.nextRetryDelay
        });
      }
    );

    try {
      for await (const chunk of (streamResult as any)) {
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
      logger.error("Expert", `Stream interrupted for expert ${expert.role}`, streamError);
      throw streamError;
    }
  } else {
    let contentPayload: any = expert.prompt;

    if (attachments.length > 0) {
      contentPayload = [
        { type: 'text', text: expert.prompt }
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
      systemInstruction: getExpertSystemInstruction(expert.role, expert.description, context),
      content: contentPayload,
      temperature: expert.temperature,
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
      logger.error("Expert", `Stream interrupted for expert ${expert.role} (OpenAI)`, streamError);
      throw streamError;
    }
  }
  };

  try {
    await withTimeout(streamTask(), DEEPTHINK_TIMEOUTS.EXPERT, 'expert');
  } catch (e) {
    if (e instanceof TimeoutError) {
      logger.error("Expert", `Expert ${expert.role} timed out after ${DEEPTHINK_TIMEOUTS.EXPERT}ms`);
      throw e;
    }
    throw e;
  }
};
