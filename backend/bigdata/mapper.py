#!/usr/bin/env python3
import sys
import csv
import re

# Mapper: extract symptom terms from medical cases
# Input format: id, label, text

def main():
    # We use csv.reader to correctly parse quotes in the text
    reader = csv.reader(sys.stdin)
    
    # Common stop words to ignore
    stop_words = set(['i', 'have', 'been', 'experiencing', 'a', 'on', 'my', 'and', 'for', 'the', 'past', 'few', 'weeks', 'it', 'is', 'in', 'to', 'of', 'with', 'this', 'that', 'often', 'very', 'are'])
    
    first_line = True
    for row in reader:
        if first_line:
            first_line = False
            continue
            
        if len(row) < 3:
            continue
            
        text = row[2]
        # Preprocess text
        text = text.lower()
        # Remove punctuation
        text = re.sub(r'[^\w\s]', ' ', text)
        words = text.split()
        
        # Emit each meaningful word as a potential symptom
        for word in words:
            if word not in stop_words and len(word) > 2:
                # Output: symptom \t 1
                print(f"{word}\t1")

if __name__ == "__main__":
    main()
