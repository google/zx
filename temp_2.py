import random

def generate_password(length=12, include_uppercase=True, include_digits=True, include_symbols=True):
  """
  Generates a random password.

  Args:
    length: The desired length of the password.
    include_uppercase: Whether to include uppercase letters.
    include_digits: Whether to include digits.
    include_symbols: Whether to include symbols.

  Returns:
    A randomly generated password.
  """

  lowercase = 'abcdefghijklmnopqrstuvwxyz'
  uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  digits = '0123456789'
  symbols = '!@#$%^&*()_+=-`~[]\{}|;\':",./<>?'

  characters = lowercase
  if include_uppercase:
    characters += uppercase
  if include_digits:
    characters += digits
  if include_symbols:
    characters += symbols

  password = ''.join(random.choice(characters) for i in range(length))
  return password

if __name__ == "__main__":
  """
  This code will only run when the script is executed directly.
  """
  password = generate_password()
  print(f"Your random password is: {password}")
