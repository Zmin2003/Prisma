"""Safe code execution tool"""

import sys
import io
import contextlib
from multiprocessing import Process, Queue
from typing import Optional

from langchain_core.tools import tool


class SafeExecutionEnvironment:
    """Restricted execution environment for Python code"""
    
    ALLOWED_BUILTINS = {
        'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
        'callable', 'chr', 'complex', 'dict', 'divmod', 'enumerate', 'filter',
        'float', 'format', 'frozenset', 'getattr', 'hasattr', 'hash', 'hex',
        'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'map', 'max',
        'min', 'next', 'oct', 'ord', 'pow', 'print', 'range', 'repr', 'reversed',
        'round', 'set', 'slice', 'sorted', 'str', 'sum', 'tuple', 'type', 'zip',
    }
    
    BLOCKED_MODULES = {
        'os', 'sys', 'subprocess', 'shutil', 'pathlib', 'socket', 'requests',
        'urllib', 'http', 'ftplib', 'smtplib', 'telnetlib', 'pickle', 'shelve',
        '__builtins__', 'builtins', 'importlib', 'ctypes', 'multiprocessing',
    }
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
    
    def _execute_once(self, code: str) -> tuple[str, Optional[str]]:
        for blocked in self.BLOCKED_MODULES:
            if blocked in code:
                return "", f"Blocked module detected: {blocked}"
        
        safe_builtins = {
            name: getattr(__builtins__, name) if hasattr(__builtins__, name) 
            else __builtins__[name] if isinstance(__builtins__, dict) else None
            for name in self.ALLOWED_BUILTINS
        }
        safe_builtins = {k: v for k, v in safe_builtins.items() if v is not None}
        
        allowed_imports = {'math', 'json', 'datetime', 'time', 'collections', 'itertools', 'functools', 're', 'random', 'string', 'decimal', 'fractions', 'statistics'}
        
        def safe_import(name, *args, **kwargs):
            if name in allowed_imports:
                return __import__(name, *args, **kwargs)
            raise ImportError(f"Import of '{name}' is not allowed")
        
        safe_builtins['__import__'] = safe_import
        
        global_env = {'__builtins__': safe_builtins}
        local_env = {}
        
        stdout = io.StringIO()
        stderr = io.StringIO()
        
        try:
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                exec(code, global_env, local_env)
            
            output = stdout.getvalue()
            errors = stderr.getvalue()
            
            if errors:
                return output, errors
            return output, None
            
        except Exception as e:
            return stdout.getvalue(), f"{type(e).__name__}: {str(e)}"

    def execute(self, code: str) -> tuple[str, Optional[str]]:
        queue: Queue = Queue()
        process = Process(target=_run_code_worker, args=(code, queue))
        process.start()
        process.join(self.timeout)
        if process.is_alive():
            process.terminate()
            process.join()
            return "", f"Timeout: Execution exceeded {self.timeout}s"
        if queue.empty():
            return "", "Execution failed"
        return queue.get()


def _run_code_worker(code: str, queue: Queue):
    env = SafeExecutionEnvironment(timeout=0)
    output, error = env._execute_once(code)
    queue.put((output, error))


def create_code_executor(timeout: int = 5):
    """Create a code executor with specified timeout"""
    return SafeExecutionEnvironment(timeout=timeout)


@tool
def code_executor_tool(code: str) -> str:
    """Execute Python code safely and return the output.
    
    This tool runs Python code in a sandboxed environment with limited
    functionality. Only basic math, json, datetime, collections, itertools,
    functools, and re modules are available.
    
    Args:
        code: Python code to execute
        
    Returns:
        Output from code execution or error message
    """
    executor = create_code_executor()
    output, error = executor.execute(code)
    
    if error:
        return f"Output:\n{output}\n\nError:\n{error}"
    
    if not output:
        return "Code executed successfully with no output."
    
    return output
