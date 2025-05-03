import { Input } from '@/core/components/ui/input';
import { cn } from '@/core/lib/utils';

function FormInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input className={cn('focus-visible:ring-main', className)} {...props} />
  );
}

export default FormInput;
