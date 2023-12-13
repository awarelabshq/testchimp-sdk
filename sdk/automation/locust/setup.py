from setuptools import setup, find_packages

setup(
    name='tracked-tests-locust',
    version='0.0.1',
    packages=find_packages(),
    install_requires=['locust'],
    # Include other metadata like author, description, etc.
)
