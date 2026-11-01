// Lien d'aperçu d'une étude : /run/:id?preview=<clé>. Montre l'étude, même en
// brouillon, sans enregistrer de réponses. La clé (backend/src/lib/apercu.js)
// est lue par l'équipe dans le constructeur ; le lien peut être partagé avec
// des collègues sans compte MindCraft.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from './api'

export function useCleApercu(studyId) {
  const { data } = useQuery({
    queryKey: ['preview-key', studyId],
    queryFn: async () => (await api.get(`/api/studies/${studyId}/preview-key`)).data.key,
    enabled: !!studyId,
    staleTime: Infinity,
  })
  return data || null
}

// Remplace la clé : l'ancien lien cesse de fonctionner.
export function useChangerCleApercu(studyId) {
  const queryClient = useQueryClient()
  return async () => {
    const { data } = await api.post(`/api/studies/${studyId}/preview-key`)
    queryClient.setQueryData(['preview-key', studyId], data.key)
    return data.key
  }
}

export const lienApercu = (studyId, cle, blockId) =>
  `/run/${studyId}?preview=${encodeURIComponent(cle)}${blockId ? `&blockId=${blockId}` : ''}`
