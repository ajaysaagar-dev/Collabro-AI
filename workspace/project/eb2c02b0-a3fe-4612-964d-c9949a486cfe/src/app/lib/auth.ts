import NextAuth from "next-auth/client";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import type { DefaultSession, DefaultJWT } from "next-auth/client";
import type { JWT } from "next-auth/client/jwt";

declare module "next-auth/client" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
  }
}

interface UserCredentials {
  email: string;
  password: string;
}

interface UserWithPassword {
  id: string | number;
  email: string;
  name?: string | null;
  role?: string | null;
  password: string;
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: UserCredentials | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        }) as UserWithPassword | null;

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name ?? undefined,
          role: user.role ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);