"""Calculator tool for mathematical expressions"""

import math
import re
from typing import Union

from langchain_core.tools import tool


SAFE_MATH_FUNCTIONS = {
    'abs': abs,
    'round': round,
    'min': min,
    'max': max,
    'sum': sum,
    'pow': pow,
    'sqrt': math.sqrt,
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'asin': math.asin,
    'acos': math.acos,
    'atan': math.atan,
    'atan2': math.atan2,
    'sinh': math.sinh,
    'cosh': math.cosh,
    'tanh': math.tanh,
    'exp': math.exp,
    'log': math.log,
    'log10': math.log10,
    'log2': math.log2,
    'floor': math.floor,
    'ceil': math.ceil,
    'factorial': math.factorial,
    'gcd': math.gcd,
    'pi': math.pi,
    'e': math.e,
    'tau': math.tau,
    'inf': math.inf,
}


def safe_eval(expression: str) -> Union[float, int, str]:
    """Safely evaluate a mathematical expression"""
    
    cleaned = expression.replace('^', '**')
    
    if re.search(r'[a-zA-Z_][a-zA-Z0-9_]*\s*\(', cleaned):
        pass
    
    dangerous_patterns = [
        r'__\w+__',
        r'\bimport\b',
        r'\bexec\b',
        r'\beval\b',
        r'\bopen\b',
        r'\bfile\b',
        r'\binput\b',
        r'\bcompile\b',
        r'\bglobals\b',
        r'\blocals\b',
        r'\bgetattr\b',
        r'\bsetattr\b',
        r'\bdelattr\b',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return f"Error: Unsafe pattern detected: {pattern}"
    
    try:
        result = eval(cleaned, {"__builtins__": {}}, SAFE_MATH_FUNCTIONS)
        return result
    except ZeroDivisionError:
        return "Error: Division by zero"
    except ValueError as e:
        return f"Error: {str(e)}"
    except SyntaxError as e:
        return f"Error: Invalid expression - {str(e)}"
    except Exception as e:
        return f"Error: {type(e).__name__} - {str(e)}"


@tool
def calculator_tool(expression: str) -> str:
    """Evaluate a mathematical expression.
    
    Supports basic arithmetic (+, -, *, /, **, %), parentheses,
    and common math functions (sqrt, sin, cos, tan, log, exp, etc.).
    
    Examples:
        - "2 + 2" -> 4
        - "sqrt(16)" -> 4.0
        - "sin(pi/2)" -> 1.0
        - "log(e)" -> 1.0
        - "2^10" -> 1024
    
    Args:
        expression: Mathematical expression to evaluate
        
    Returns:
        Result of the calculation or error message
    """
    result = safe_eval(expression)
    
    if isinstance(result, float):
        if result == int(result):
            return str(int(result))
        return f"{result:.10g}"
    
    return str(result)
