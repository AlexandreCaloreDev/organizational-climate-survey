"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authService } from '@/lib/services/authService';

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
};

const registerSchema = z.object({
  nome_fantasia: z.string().min(1, { message: 'Nome fantasia é obrigatório.' }),
  razao_social: z.string().min(1, { message: 'Razão social é obrigatória.' }),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/, { message: 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX.' }),
  nome_admin: z.string().min(1, { message: 'Nome do administrador é obrigatório.' }),
  email: z.string().email({ message: 'E-mail inválido.' }),
  senha: z
    .string()
    .min(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
    .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos 1 letra maiúscula.' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos 1 número.' }),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function NovaEmpresaPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (data: RegisterFormInputs) => {
    setRegisterError(null);
    try {
      await authService.bootstrap({
        nome_fantasia: data.nome_fantasia,
        razao_social: data.razao_social,
        cnpj: data.cnpj,
        nome_admin: data.nome_admin,
        email: data.email,
        senha: data.senha,
      });
      toast.success('Empresa e administrador cadastrados com sucesso!');
      router.push('/login');
    } catch (error: any) {
      let msg = error?.response?.data?.message || error?.response?.data?.error || 'Erro ao realizar o cadastro. Tente novamente.';
      if (error?.response?.status === 403 || msg.toLowerCase().includes("sistema já inicializado") || msg.toLowerCase().includes("sistema ja inicializado")) {
        msg = "Esta empresa já possui um cadastro ativo no sistema.";
      }
      setRegisterError(msg);
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-600 p-4">
      <div className="relative flex w-full max-w-6xl min-h-[600px] rounded-3xl overflow-hidden shadow-2xl bg-white">
        {/* Lado esquerdo: Formulário de Cadastro */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-2xl border-none shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Crie sua conta Atmos!</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Preencha as informações abaixo para inicializar sua empresa e criar o perfil de administrador do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input id="nome_fantasia" placeholder="Tech Corp" {...register('nome_fantasia')} />
                    {errors.nome_fantasia && <p className="text-red-500 text-sm">{errors.nome_fantasia.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="razao_social">Razão Social</Label>
                    <Input id="razao_social" placeholder="Tech Corp LTDA" {...register('razao_social')} />
                    {errors.razao_social && <p className="text-red-500 text-sm">{errors.razao_social.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      placeholder="12.345.678/0001-90"
                      {...register('cnpj', {
                        onChange: (e) => {
                          e.target.value = formatCNPJ(e.target.value);
                        }
                      })}
                    />
                    {errors.cnpj && <p className="text-red-500 text-sm">{errors.cnpj.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nome_admin">Nome do Administrador</Label>
                    <Input id="nome_admin" placeholder="Maria Souza" {...register('nome_admin')} />
                    {errors.nome_admin && <p className="text-red-500 text-sm">{errors.nome_admin.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail Corporativo</Label>
                    <Input id="email" type="email" placeholder="admin@techcorp.com" {...register('email')} />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" type="password" placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número" {...register('senha')} />
                    {errors.senha && <p className="text-red-500 text-sm">{errors.senha.message}</p>}
                  </div>
                </div>
                {registerError && <p className="text-red-500 text-sm text-center">{registerError}</p>}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? 'Cadastrando...' : 'Criar Conta'}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                Já possui uma conta?{' '}
                <Link href="/login" className="underline text-blue-600 hover:text-blue-700">
                  Faça login!
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado direito: Gradiente de fundo */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-blue-800 hidden md:flex items-center justify-center">
          {/* Conteúdo opcional para o lado direito, como uma imagem ou ilustração */}
        </div>
      </div>
    </div>
  );
}
