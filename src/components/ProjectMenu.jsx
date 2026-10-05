import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Menu from './Menu.jsx'
import { ConfirmModal, PromptModal } from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { deleteProject, duplicateProject, renameProject, setProjectStatus } from '../lib/projects.js'

export default function ProjectMenu({ project, onChanged, afterDelete, beforeDuplicate, showOpen }) {
  const nav = useNavigate()
  const toast = useToast()
  const [modal, setModal] = useState(null)
  const archived = project.status === 'archived'

  async function duplicate() {
    try {
      await beforeDuplicate?.()
      await duplicateProject(project)
      toast('Project duplicated')
      onChanged?.()
    } catch (e) {
      toast(e.message || 'Could not duplicate the project.', 'error')
    }
  }

  async function toggleArchive() {
    try {
      await setProjectStatus(project.id, archived ? 'active' : 'archived')
      toast(archived ? 'Project restored' : 'Project archived')
      onChanged?.()
    } catch (e) {
      toast(e.message || 'Could not update the project.', 'error')
    }
  }

  return (
    <>
      <Menu
        label={`Options for ${project.title}`}
        items={[
          showOpen && { label: 'Open', onClick: () => nav(`/project/${project.id}`) },
          { label: 'Rename', onClick: () => setModal('rename') },
          { label: 'Duplicate', onClick: duplicate },
          { label: archived ? 'Restore from archive' : 'Archive', onClick: toggleArchive },
          { divider: true },
          { label: 'Delete', danger: true, onClick: () => setModal('delete') },
        ]}
      />
      {modal === 'rename' && (
        <PromptModal
          title="Rename project"
          label="Project name"
          initial={project.title}
          onClose={() => setModal(null)}
          onSubmit={async (title) => {
            try {
              await renameProject(project.id, title)
              setModal(null)
              onChanged?.(title)
            } catch (e) {
              toast(e.message || 'Could not rename the project.', 'error')
            }
          }}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title="Delete this project?"
          danger
          confirmLabel="Delete project"
          message={
            project.is_demo
              ? 'This deletes the demo project and its script. You can delete it any time, and it will not come back.'
              : `"${project.title}" and its script will be deleted permanently. This cannot be undone.`
          }
          onClose={() => setModal(null)}
          onConfirm={async () => {
            try {
              await deleteProject(project.id)
              setModal(null)
              toast('Project deleted')
              afterDelete ? afterDelete() : onChanged?.()
            } catch (e) {
              toast(e.message || 'Could not delete the project.', 'error')
            }
          }}
        />
      )}
    </>
  )
}
