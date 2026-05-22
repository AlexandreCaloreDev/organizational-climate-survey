"use client";

import * as React from "react";

interface RadioGroupContextValue {
  value: string;
  onChange: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
}

export function RadioGroup({ 
  children, 
  value, 
  defaultValue,
  onChange, 
  onValueChange,
  ...props 
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const currentValue = value ?? internalValue;

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    onValueChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  checked?: boolean;
  onChange?: (value: string) => void;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ value, checked, onChange, className, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    
    const isChecked = context ? context.value === value : checked;
    const handleChange = () => {
      if (context) {
        context.onChange(value);
      }
      onChange?.(value);
    };

    return (
      <input 
        type="radio" 
        value={value} 
        checked={isChecked}
        onChange={handleChange}
        className={className}
        {...props} 
        ref={ref} 
      />
    );
  }
);

RadioGroupItem.displayName = "RadioGroupItem";