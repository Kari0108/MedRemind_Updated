#!/usr/bin/env python3
import sys

# Reducer: sum occurrences of symptom terms
def main():
    current_word = None
    current_count = 0
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        parts = line.split('\t')
        if len(parts) != 2:
            continue
            
        word, count = parts
        try:
            count = int(count)
        except ValueError:
            continue
            
        if current_word == word:
            current_count += count
        else:
            if current_word:
                print(f"{current_word}\t{current_count}")
            current_word = word
            current_count = count
            
    if current_word == word:
        print(f"{current_word}\t{current_count}")

if __name__ == "__main__":
    main()
