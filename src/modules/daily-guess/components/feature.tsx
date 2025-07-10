'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Check from '@/core/components/icons/check';
import Xcancel from '@/core/components/icons/x';
import FeatureTooltip from '@/core/components/main/feature-tooltip';
import { LangFeatures } from '@/core/lib/types';

type Props = {
  id: LangFeatures;
  match?: boolean;
};

const featureVariants = {
  hidden: { y: 20, x: -20, opacity: 0 },
  visible: { y: 0, x: 0, opacity: 1 },
};

function Feature({ id, match = false }: Props) {
  const t = useTranslations('Features.name');

  return (
    <FeatureTooltip feature={id}>
      <motion.div
        variants={featureVariants}
        className='md:h-12 bg-[#FDFBFB] flex items-center gap-2 rounded-[3px] shadow-xl p-1 md:p-3 border border-soft-det'
        style={{
          transformOrigin: 'center bottom',
        }}
      >
        <span className='text-xl'>
          {match ? (
            <Check className='text-main' />
          ) : (
            <Xcancel className='text-[#FF2C2C]' />
          )}
        </span>
        {t(id)}
      </motion.div>
    </FeatureTooltip>
  );
}
export default Feature;
