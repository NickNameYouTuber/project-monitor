import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './ui/utils';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    setOpen(newValue.length > 0 && filteredSuggestions.length > 0);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0 && filteredSuggestions.length > 0) {
      setOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow clicking on suggestions
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className={cn("pr-8", className)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          {filteredSuggestions.length > 0 && (
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandGroup>
            {filteredSuggestions.length === 0 ? (
              <CommandEmpty>No suggestions found.</CommandEmpty>
            ) : (
              filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSelectSuggestion(suggestion)}
                  className="cursor-pointer"
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === suggestion ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  {suggestion}
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}