import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'

export interface SearchReplaceState {
  searchTerm: string
  activeIndex: number
}

export interface SearchReplaceCommands {
  setSearchTerm: (term: string) => boolean
  setReplaceTerm: (term: string) => boolean
  nextMatch: () => boolean
  previousMatch: () => boolean
  replaceCurrent: () => boolean
  replaceAll: () => boolean
}

export interface SearchReplaceStorage {
  replaceTerm: string
}

export const searchReplacePluginKey = new PluginKey<{ searchTerm: string; activeIndex: number; results: { from: number; to: number }[] }>('searchReplace')

function findMatches(doc: PmNode, searchTerm: string): { from: number; to: number }[] {
  if (!searchTerm) return []
  const results: { from: number; to: number }[] = []
  const term = searchTerm.toLowerCase()
  doc.descendants((node: PmNode, pos: number) => {
    if (!node.isText) return
    const text = node.text!.toLowerCase()
    let index = text.indexOf(term)
    while (index !== -1) {
      results.push({ from: pos + index, to: pos + index + searchTerm.length })
      index = text.indexOf(term, index + 1)
    }
  })
  return results
}

export const SearchReplace = Extension.create<object, SearchReplaceStorage>({
  name: 'searchReplace',

  addStorage() {
    return {
      replaceTerm: '',
    }
  },

  addCommands() {
    return {
      setSearchTerm: (term: string) => ({ tr, dispatch }: any) => {
        if (dispatch) {
          dispatch(tr.setMeta(searchReplacePluginKey, { type: 'setSearch', term }))
        }
        return true
      },
      setReplaceTerm: (term: string) => ({ editor }: any) => {
        editor.storage.searchReplace.replaceTerm = term
        return true
      },
      nextMatch: () => ({ tr, dispatch }: any) => {
        if (dispatch) {
          dispatch(tr.setMeta(searchReplacePluginKey, { type: 'next' }))
        }
        return true
      },
      previousMatch: () => ({ tr, dispatch }: any) => {
        if (dispatch) {
          dispatch(tr.setMeta(searchReplacePluginKey, { type: 'previous' }))
        }
        return true
      },
      replaceCurrent: () => ({ editor }: any) => {
        const pluginState = searchReplacePluginKey.getState(editor.state)
        if (!pluginState || pluginState.results.length === 0) return false
        const match = pluginState.results[pluginState.activeIndex]
        if (!match) return false
        const { replaceTerm } = editor.storage.searchReplace
        editor.chain()
          .focus()
          .insertContentAt({ from: match.from, to: match.to }, replaceTerm)
          .run()
        return true
      },
      replaceAll: () => ({ editor }: any) => {
        const pluginState = searchReplacePluginKey.getState(editor.state)
        if (!pluginState || pluginState.results.length === 0) return false
        const { replaceTerm } = editor.storage.searchReplace
        const { tr } = editor.state
        const results = [...pluginState.results]
        for (let i = results.length - 1; i >= 0; i--) {
          tr.insertText(replaceTerm, results[i].from, results[i].to)
        }
        editor.view.dispatch(tr)
        return true
      },
    } as any
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchReplacePluginKey,
        state: {
          init() {
            return { searchTerm: '', activeIndex: 0, results: [] as { from: number; to: number }[] }
          },
          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(searchReplacePluginKey)
            let { searchTerm, activeIndex, results } = prev

            if (meta) {
              if (meta.type === 'setSearch') {
                searchTerm = meta.term
                results = findMatches(newState.doc, searchTerm)
                activeIndex = 0
              } else if (meta.type === 'next') {
                if (results.length > 0) {
                  activeIndex = (activeIndex + 1) % results.length
                }
              } else if (meta.type === 'previous') {
                if (results.length > 0) {
                  activeIndex = (activeIndex - 1 + results.length) % results.length
                }
              }
            } else if (tr.docChanged && searchTerm) {
              results = findMatches(newState.doc, searchTerm)
              if (activeIndex >= results.length) {
                activeIndex = Math.max(0, results.length - 1)
              }
            } else {
              return prev
            }

            return { searchTerm, activeIndex, results }
          },
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state)
            if (!pluginState || !pluginState.searchTerm || pluginState.results.length === 0) {
              return DecorationSet.empty
            }

            const decorations: Decoration[] = pluginState.results.map((match, i) =>
              Decoration.inline(match.from, match.to, {
                class: i === pluginState.activeIndex ? 'search-match-active' : 'search-match',
              })
            )

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
