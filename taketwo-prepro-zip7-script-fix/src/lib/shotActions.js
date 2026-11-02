import { useProject } from '../pages/ProjectLayout.jsx'
import { useToast } from '../components/Toast.jsx'
import { copyImage, removeImages, uploadImage } from './images.js'
import { newShot, nextPosition, positionAfter, sortShots } from './shots.js'

// Things you can do to a shot, shared by the storyboard and the shot list
export function useShotActions() {
  const { project, shots, userId } = useProject()
  const toast = useToast()
  const all = () => sortShots(shots.rowsRef.current)
  const find = (id) => shots.rowsRef.current.find((s) => s.id === id)

  // New shots go after the last shot of the same scene, so scenes stay together
  function positionForNew(sceneId) {
    const sorted = all()
    if (sceneId) {
      const inScene = sorted.filter((s) => s.scene_id === sceneId)
      if (inScene.length) return positionAfter(sorted, inScene[inScene.length - 1].id)
    }
    return nextPosition(sorted)
  }

  async function addShot(partial = {}) {
    try {
      return await shots.add(newShot({ position: positionForNew(partial.scene_id ?? null), ...partial }))
    } catch (e) {
      toast(e.message || 'Could not add that.', 'error')
      return null
    }
  }

  async function setImage(shotId, file) {
    try {
      const path = await uploadImage(file, { userId, projectId: project.id })
      const old = find(shotId)?.image_path
      shots.update(shotId, { image_path: path })
      if (old) removeImages([old])
      return path
    } catch (e) {
      toast(e.message || 'Could not upload that picture.', 'error')
      return null
    }
  }

  function clearImage(shotId) {
    const old = find(shotId)?.image_path
    shots.update(shotId, { image_path: null })
    if (old) removeImages([old])
  }

  async function addImages(files, sceneId = null) {
    const imgs = [...files].filter((f) => String(f.type).startsWith('image/'))
    if (!imgs.length) {
      toast('Those files are not pictures.', 'error')
      return 0
    }
    let made = 0
    for (const f of imgs) {
      try {
        const path = await uploadImage(f, { userId, projectId: project.id })
        const row = await addShot({ image_path: path, scene_id: sceneId })
        if (row) made += 1
      } catch (e) {
        toast(e.message || 'Could not upload a picture.', 'error')
      }
    }
    return made
  }

  async function duplicate(shot) {
    const { id, created_at, updated_at, user_id, project_id, ...rest } = shot
    let image_path = rest.image_path
    if (image_path) image_path = await copyImage(image_path, project.id)
    return addShot({ ...rest, image_path, position: positionAfter(all(), id) })
  }

  async function deleteShot(shot) {
    try {
      await shots.remove(shot.id)
      if (shot.image_path) removeImages([shot.image_path])
    } catch (e) {
      toast(e.message || 'Could not delete that.', 'error')
    }
  }

  return { all, positionForNew, addShot, setImage, clearImage, addImages, duplicate, deleteShot }
}
