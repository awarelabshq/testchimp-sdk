from setuptools import setup, find_packages

setup(
    name='tracked-tests-locust',
    version='0.0.268',
    py_modules=['tracked_tests'],  # Specify the main module (tracked_tests.py)
    # Include the tracked_tests.py file using package_data
    package_data={
        '': ['tracked_tests.py'],  # Include tracked_tests.py from the root
    },
    # Other metadata...
)
