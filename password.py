import argparse
import getpass
import hashlib
import random
import string


def hash_str(s: str) -> int:
    """
    Convert a string into a unique deterministic integer using a hash.

    Args:
        s (str): The string to be converted

    Returns:
        int: The corresponding integer representation of `s`
    """
    hash_value = hashlib.md5(s.encode()).hexdigest()

    return int(hash_value, 16)


def is_valid_pwd(pwd: str) -> bool:
    """
    Check if a provided password is valid. A valid password has at least one
    uppercase letter, one digit, and one punctuation mark.

    :param pwd: The password to check the validity of
    :return: Whether the password is valid
    """
    has_upper = False
    has_digit = False
    has_punc = False
    for c in pwd:
        if c in string.ascii_uppercase:
            has_upper = True
        if c in string.digits:
            has_digit = True
        if c in string.punctuation:
            has_punc = True

    return has_upper and has_digit and has_punc


def gen_pwd(seed: int, pwd_len: int) -> str:
    """
    Given a seed, deterministically generate a password of the specified
    length.

    :param seed: The seed to use for the random number generator
    :param pwd_len: The desired length of the generated password
    :return: The deterministically generated password
    """
    random.seed(seed)

    chars = string.ascii_letters + string.digits + string.punctuation
    while True:
        pwd = ''.join([random.choice(chars) for _ in range(pwd_len)])

        if is_valid_pwd(pwd):
            break

    return pwd


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Generate a password for a specified application.'
    )

    parser.add_argument(
        'app',
        type=str,
        help='The application to generate a password for'
    )
    parser.add_argument(
        'user',
        type=str,
        help='The username used for the application'
    )
    parser.add_argument(
        '-l', '--length',
        type=int,
        default=32,
        help='The password length to generate. Default 32'
    )
    args = parser.parse_args()

    key = getpass.getpass(prompt='Secret: ')
    seed = hash_str(args.app + args.user + key)

    print(gen_pwd(seed, args.length))
