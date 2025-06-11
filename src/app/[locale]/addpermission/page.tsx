import { setLangPermission } from '@/modules/lang-data/actions';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

async function AddPermissionPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <p>No token</p>;
  }

  const res = await setLangPermission(token);

  return <div>Done: {res.success ? res.result : res.error}</div>;
}

export default AddPermissionPage;
