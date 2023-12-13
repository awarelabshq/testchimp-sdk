from locust import TaskSet
import uuid

class TrackedTasks(TaskSet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.invocation_id = uuid.uuid4()  # Generate a UUID for each task invocation

    def __getattr__(self, attr):
        def wrapper(*args, **kwargs):
            request_name = f"{self.__class__.__name__}.{attr}"  # Generate request name
            kwargs['headers'] = kwargs.get('headers', {})
            kwargs['headers']['trackedtest.name'] = request_name  # Add trackedtest.name
            kwargs['headers']['trackedtest.suite'] = self.__class__.__name__  # Add trackedtest.suite
            kwargs['headers']['trackedtest.invocation_id'] = str(self.invocation_id)  # Add trackedtest.invocation_id
            kwargs['headers']['test.type'] = "locust"  # Add trackedtest.name
            return getattr(self.client, attr)(*args, **kwargs)

        return wrapper
