"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const userSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres." }),
  role: z.string().min(1, { message: "Função é obrigatória." }),
});

type UserFormInputs = z.infer<typeof userSchema>;

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<UserFormInputs>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormInputs) => {
    try {
      // Simular chamada de API para cadastrar usuário
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Novo usuário cadastrado:", data);
      toast.success("Usuário cadastrado com sucesso!");
      reset(); // Limpa o formulário
      router.push("/usuarios"); // Redireciona para a lista de usuários
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error);
      toast.error("Erro ao cadastrar usuário. Tente novamente.");
    }
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
        Novo Usuário
      </h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Preencha os dados para cadastrar um novo usuário administrador.
      </p>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>Insira as informações do novo usuário.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Função</Label>
              <Input id="role" {...register("role")} />
              {errors.role && <p className="text-red-500 text-sm">{errors.role.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? "Cadastrando..." : "Cadastrar Usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

