import secrets
from functools import wraps
from locust import HttpUser, task

class TrackedTask:
    task_invocation_ids = {}

    @classmethod
    def add_tracked_headers(cls, client, class_name, task_name, trace_parent):
        headers = {
            'trackedtest.suite': class_name,
            'trackedtest.name': f"{class_name}#{task_name}",
            'test.type': 'locust',
            'traceparent': trace_parent
        }
        client.headers.update(headers)

def generate_trace_id():
    # Generate a random 32-character hexadecimal string for Trace ID
    return secrets.token_hex(16)

def generate_invocation_id():
    # Generate a random 32-character hexadecimal string for Invocation ID
    return secrets.token_hex(16)

def tracked_task(task_weight=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            class_name = func.__qualname__.split('.')[0]
            user = args[0]
            if func.__name__ not in TrackedTask.task_invocation_ids:
                TrackedTask.task_invocation_ids[func.__name__] = generate_invocation_id()
            trace_id = generate_trace_id()
            trace_parent = f"00-{trace_id}-{TrackedTask.task_invocation_ids[func.__name__]}-00"
            TrackedTask.add_tracked_headers(user.client, class_name, func.__name__, trace_parent)
            return func(*args, **kwargs)
        return task(weight=task_weight)(wrapper)
    return decorator
