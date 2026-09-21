import { redirect } from 'next/navigation'

// This used to be a separate CEO-only page. Per a later decision, the
// documents section was merged directly into the existing Knowledge Base
// page/tab instead (see CeoKnowledgeBaseManager, rendered inside
// KnowledgeBaseManager) so there's no second nav item. This route is kept
// only so an old bookmark/link doesn't 404 -- it just redirects.
export default function CeoKnowledgeBasePage() {
  redirect('/admin/knowledge-base')
}
