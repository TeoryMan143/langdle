import { Checkbox } from '@/core/components/ui/checkbox';
import { Label } from '@/core/components/ui/label';
import { LanguageCode } from '@/core/lib/types';

type Props = {
  code: LanguageCode;
  active: boolean;
};

function FeatureChecker({ code, active }: Props) {
  return (
    <Label htmlFor={code}>
      <Checkbox checked={active} id={code} />
    </Label>
  );
}

export default FeatureChecker;
