import random

class MockInterviewer:
    def __init__(self):
        self.questions = [
            "Can you tell me about a time you had to learn a new technology quickly?",
            "What is the most complex problem you have solved in your recent project?",
            "How do you handle disagreements with your team members?",
            "Describe your experience with React and Node.js.",
            "Where do you see your career heading in the next two years?"
        ]
        self.current_index = 0
        self.acknowledgments = [
            "That's a great answer. Let's move on to the next question.",
            "Interesting perspective. Thank you for sharing. Now,",
            "I see. That makes sense. Next question:",
            "Good to know. Moving on,"
        ]

    def get_next_response(self, user_input: str) -> str:
        if self.current_index >= len(self.questions):
            return "Thank you for your time. The interview is now complete."
        
        response = ""
        if user_input:
            # If the user said something, acknowledge it
            response = f"{random.choice(self.acknowledgments)} "
            
        response += self.questions[self.current_index]
        self.current_index += 1
        
        return response

# A global instance to keep track of state for the mock implementation
interviewer_session = MockInterviewer()
