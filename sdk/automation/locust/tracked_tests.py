from locust import TaskSet
import random

class TrackedTasks(TaskSet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.invocation_id = ''.join(random.choice('0123456789abcdef') for _ in range(32))  # Generate a random invocation_id

    def __getattr__(self, attr):
        def wrapper(*args, **kwargs):
            request_name = f"{self.__class__.__name__}.{attr}"  # Generate request name

            # Generate random trace ID (hexadecimal, 32 characters)
            trace_id = ''.join(random.choice('0123456789abcdef') for _ in range(32))

            # Construct traceparent header
            traceparent = f"00-{trace_id}-{self.invocation_id}-01"
            kwargs['headers'] = kwargs.get('headers', {})
            kwargs['headers']['traceparent'] = traceparent
            kwargs['headers']['trackedtest.name'] = request_name
            kwargs['headers']['trackedtest.suite'] = self.__class__.__name__
            kwargs['headers']['test.type'] = "locust"

            return getattr(self.client, attr)(*args, **kwargs)

        return wrapper
