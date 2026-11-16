import { AuthForm } from '@/components/AuthForm'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams

  return <AuthForm mode="register" message={params?.message} />
}
