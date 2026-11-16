import { AuthForm } from '@/components/AuthForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams

  return <AuthForm mode="login" message={params?.message} />
}
