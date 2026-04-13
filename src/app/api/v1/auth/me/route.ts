import { getCurrentUser } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const current = await getCurrentUser();
  if (!current.user) {
    return jsonOk({ user: null });
  }

  return jsonOk({
    user: {
      id: current.user.$id,
      email: current.user.email,
      name: current.user.name,
    },
  });
}
