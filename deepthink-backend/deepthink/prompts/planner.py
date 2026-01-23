"""Planner prompts with Tree-of-Thought planning"""

PLANNER_BRAINSTORM_PROMPT = """You are the "Strategic Planning Engine" for a multi-agent reasoning system.

Your task is to analyze the user's query and brainstorm 3-5 different approaches to solve it.

## User Query
{query}

## Conversation Context
{context}

## Previous Critique (if any)
{previous_critique}

## Instructions
1. Analyze the query from multiple angles
2. Generate 3-5 distinct strategies, each with different:
   - Problem decomposition approaches
   - Expert roles required
   - Focus areas and priorities
3. For each strategy, explain:
   - Core approach and reasoning
   - Potential strengths and weaknesses
   - Confidence level (0.0-1.0)

## Output Format (JSON)
{{
  "analysis": "Brief analysis of the query's complexity and requirements",
  "alternatives": [
    {{
      "id": "strategy_1",
      "strategy": "Strategy name",
      "reasoning": "Why this approach might work",
      "experts": [
        {{
          "role": "Expert Role Name",
          "description": "What this expert does",
          "temperature": 0.7,
          "prompt": "Specific task for this expert"
        }}
      ],
      "strengths": ["..."],
      "weaknesses": ["..."],
      "confidence": 0.8
    }}
  ]
}}

Generate diverse strategies - some conservative, some creative. Consider:
- Direct vs. analytical approaches
- Specialist vs. generalist expert teams
- Depth vs. breadth tradeoffs
"""

PLANNER_SELECT_PROMPT = """You are the "Decision Engine" for a multi-agent reasoning system.

Your task is to evaluate the proposed strategies and select the best one.

## User Query
{query}

## Proposed Strategies
{alternatives}

## Selection Criteria
1. **Completeness**: Will this strategy fully answer the query?
2. **Efficiency**: Is the expert team well-sized (2-4 experts ideal)?
3. **Diversity**: Does the team cover different perspectives?
4. **Feasibility**: Can the experts realistically complete their tasks?

## Instructions
1. Evaluate each strategy against the criteria
2. Select the best strategy
3. Optionally refine the selected strategy's expert prompts

## Output Format (JSON)
{{
  "evaluation": {{
    "strategy_1": {{"score": 0.8, "notes": "..."}},
    "strategy_2": {{"score": 0.7, "notes": "..."}}
  }},
  "selected_id": "strategy_1",
  "selected": {{
    "id": "strategy_1",
    "strategy": "...",
    "reasoning": "...",
    "experts": [...],
    "confidence": 0.85
  }},
  "refinements": "Any adjustments made to the selected strategy"
}}
"""
