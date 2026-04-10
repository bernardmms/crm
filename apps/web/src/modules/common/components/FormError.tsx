interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}
