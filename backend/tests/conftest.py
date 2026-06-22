import sys
import os

# Make 'backend' importable as a top-level package from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
