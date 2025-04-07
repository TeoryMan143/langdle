import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/ui/table';
import Feature from './feature';

const PLACEHOLDER = [
  {
    code: 'en',
    name: 'english',
    features: [
      {
        id: 'latinAlphabet',
        match: true,
      },
      {
        id: 'stressTimed',
        match: false,
      },
    ],
  },
  {
    code: 'ru',
    name: 'русский',
    exonym: 'russian',
    features: [
      {
        id: 'stressTimed',
        match: false,
      },
      {
        id: 'cyrillicAlphabet',
        match: false,
      },
    ],
  },
];

function GuessesTable() {
  return (
    <Table>
      <TableHeader className='text-lg h-28'>
        <TableRow>
          <TableHead className='w-[144px] text-center font-semibold relative after:h-[80%] after:w-[2px] after:bg-soft-det after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2'>
            Language
          </TableHead>
          <TableHead className='font-semibold  text-center'>Features</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className='bg-background'>
        {PLACEHOLDER.map(({ code, name, features, exonym }) => (
          <TableRow key={code}>
            <TableCell className='w-[144px] text-center border-r-1 border-soft-det'>
              {name} {exonym && `(${exonym})`}
            </TableCell>
            <TableCell className='flex gap-2.5'>
              {features.map(f => (
                <Feature key={name + f.id} feat={f} />
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export default GuessesTable;
