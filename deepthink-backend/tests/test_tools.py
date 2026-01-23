"""Tests for tools"""

import pytest
from deepthink.tools.calculator import calculator_tool, safe_eval
from deepthink.tools.code_executor import code_executor_tool, SafeExecutionEnvironment


class TestCalculator:
    """Test calculator tool"""
    
    def test_basic_arithmetic(self):
        assert safe_eval("2 + 2") == 4
        assert safe_eval("10 - 3") == 7
        assert safe_eval("5 * 6") == 30
        assert safe_eval("20 / 4") == 5.0
    
    def test_power(self):
        assert safe_eval("2 ** 3") == 8
        assert safe_eval("2^10") == 1024
    
    def test_math_functions(self):
        import math
        assert safe_eval("sqrt(16)") == 4.0
        assert abs(safe_eval("sin(0)")) < 0.0001
        assert abs(safe_eval("cos(0)") - 1) < 0.0001
    
    def test_constants(self):
        import math
        assert abs(safe_eval("pi") - math.pi) < 0.0001
        assert abs(safe_eval("e") - math.e) < 0.0001
    
    def test_division_by_zero(self):
        result = safe_eval("1 / 0")
        assert "Error" in str(result)
    
    def test_blocks_dangerous_patterns(self):
        result = safe_eval("__import__('os')")
        assert "Error" in str(result) or "Unsafe" in str(result)
        
        result = safe_eval("exec('print(1)')")
        assert "Error" in str(result) or "Unsafe" in str(result)


class TestCodeExecutor:
    """Test code executor"""
    
    def test_simple_code(self):
        env = SafeExecutionEnvironment()
        output, error = env.execute("print('hello')")
        
        assert "hello" in output
        assert error is None
    
    def test_math_operations(self):
        env = SafeExecutionEnvironment()
        output, error = env.execute("import math\nprint(math.sqrt(16))")
        
        assert "4" in output
        assert error is None
    
    def test_blocks_os(self):
        env = SafeExecutionEnvironment()
        output, error = env.execute("import os")
        
        assert error is not None
    
    def test_blocks_subprocess(self):
        env = SafeExecutionEnvironment()
        output, error = env.execute("import subprocess")
        
        assert error is not None
    
    def test_allowed_imports(self):
        env = SafeExecutionEnvironment()
        
        output, error = env.execute("import json\nprint(json.dumps({'a': 1}))")
        assert error is None
        assert "a" in output
        
        output, error = env.execute("import datetime\nprint(datetime.date.today())")
        assert error is None
