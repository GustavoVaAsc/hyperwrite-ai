import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'

export interface SearchReplaceStorage {
  searchTerm: string
  replaceTerm: string
  results: { from: number; to: number }[]
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

const searchReplacePluginKey = new PluginKey('searchReplace')

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
      searchTerm: '',
      replaceTerm: '',
      results: [],
      activeIndex: 0,
    }
  },

  addCommands() {
    return {
      setSearchTerm: (term: string) => ({ editor }: any) => {
        editor.storage.searchReplace.searchTerm = term
        editor.storage.searchReplace.results = findMatches(editor.state.doc, term)
        editor.storage.searchReplace.activeIndex = 0
        editor.view.dispatch(editor.state.tr.setMeta(searchReplacePluginKey, { updated: true }))
        return true
      },
      setReplaceTerm: (term: string) => ({ editor }: any) => {
        editor.storage.searchReplace.replaceTerm = term
        return true
      },
      nextMatch: () => ({ editor }: any) => {
        const { results, activeIndex } = editor.storage.searchReplace
        if (results.length === 0) return false
        editor.storage.searchReplace.activeIndex = (activeIndex + 1) % results.length
        editor.view.dispatch(editor.state.tr.setMeta(searchReplacePluginKey, { updated: true }))
        return true
      },
      previousMatch: () => ({ editor }: any) => {
        const { results, activeIndex } = editor.storage.searchReplace
        if (results.length === 0) return false
        editor.storage.searchReplace.activeIndex = (activeIndex - 1 + results.length) % results.length
        editor.view.dispatch(editor.state.tr.setMeta(searchReplacePluginKey, { updated: true }))
        return true
      },
      replaceCurrent: () => ({ editor }: any) => {
        const { results, activeIndex, replaceTerm } = editor.storage.searchReplace
        if (results.length === 0) return false
        const match = results[activeIndex]
        editor.chain()
          .focus()
          .insertContentAt({ from: match.from, to: match.to }, replaceTerm)
          .run()
        editor.storage.searchReplace.results = findMatches(editor.state.doc, editor.storage.searchReplace.searchTerm)
        if (editor.storage.searchReplace.activeIndex >= editor.storage.searchReplace.results.length) {
          editor.storage.searchReplace.activeIndex = 0
        }
        editor.view.dispatch(editor.state.tr.setMeta(searchReplacePluginKey, { updated: true }))
        return true
      },
      replaceAll: () => ({ editor }: any) => {
        const { searchTerm, replaceTerm } = editor.storage.searchReplace
        if (!searchTerm) return false
        const results = findMatches(editor.state.doc, searchTerm)
        const { tr } = editor.state
        for (let i = results.length - 1; i >= 0; i--) {
          tr.insertText(replaceTerm, results[i].from, results[i].to)
        }
        editor.view.dispatch(tr)
        editor.storage.searchReplace.results = []
        editor.storage.searchReplace.activeIndex = 0
        editor.view.dispatch(editor.state.tr.setMeta(searchReplacePluginKey, { updated: true }))
        return true
      },
    } as any
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: searchReplacePluginKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldState, _oldEditorState, newEditorState) {
            const meta = tr.getMeta(searchReplacePluginKey)
            const docChanged = tr.docChanged

            if (!meta && !docChanged) return oldState

            const { searchTerm } = extension.storage
            if (!searchTerm) return DecorationSet.empty

            if (docChanged) {
              extension.storage.results = findMatches(newEditorState.doc, searchTerm)
              if (extension.storage.activeIndex >= extension.storage.results.length) {
                extension.storage.activeIndex = 0
              }
            }

            const decorations: Decoration[] = []
            extension.storage.results.forEach((match, i) => {
              decorations.push(
                Decoration.inline(match.from, match.to, {
                  class: i === extension.storage.activeIndex ? 'search-match-active' : 'search-match',
                })
              )
            })

            return DecorationSet.create(newEditorState.doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
