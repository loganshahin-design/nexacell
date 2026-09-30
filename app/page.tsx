import Workspace from "@/components/Workspace";
import Access from "@/components/auth/Access";
export default function Page() {
  return (
    <Access>
      <Workspace />
    </Access>
  );
}
