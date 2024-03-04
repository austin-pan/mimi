# Mimi

Mimi - secret in Mandarin

**Disclaimer:** I am not a security expert.

Mimi is an offline password manager tool that deterministically 
generates passwords based on application, username, password 
length, and a secret. This allows passwords to not be stored 
anywhere.

When the password is generated, it will be copied to your
clipboard for a few, by default 5, seconds before being replaced
with what was previously on your clipboard.

The help page of using `password.py`
```
> python3 password.py -h                                                  [±master ✓]
usage: password.py [-h] [-l LENGTH] [-t TIME] app user

Generate a password for a specified application.

positional arguments:
  user                  The username used for the application.
  app                   The application to generate a password for.

options:
  -h, --help            show this help message and exit
  -l LENGTH, --length LENGTH
                        The password length to generate. Default 32.
```

For example, to create an account for "gmail" 
using "john.smith@gmail.com", we can use

```
> python3 password.py john.smith@gmail.com gmail
Secret:
```

to generate a 32 length password after being prompted for a
*secret*. Keep in mind that all values are case-sensitive.
