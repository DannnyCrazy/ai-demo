import { useLocalStorage } from '@vueuse/core'

type BaseModelItem = {
  type: 'local' | 'online'
  pin: boolean
  isBase: boolean
  comparePosition: 0 | 1 | 2
  similarity?: number
  documentId: string
  documentIdUpdateTime?: number
}

type StorageModel = BaseModelItem & {
  fileId?: string
  id?: string
  configName?: string
  fileName?: string
  prodName?: string
  prodImageId?: string
}

const useModelCompare = () => {
  const storageModelList = useLocalStorage<StorageModel[]>('model-compare-model-list', [])
  const getAddModelInfo = (
    info:
      | { id: string; configName: string; prodName: string; prodImageId: string }
      | { fileId: string; fileName: string }
  ): StorageModel => {
    if ('fileId' in info) {
      return {
        ...info,
        documentId: '',
        type: 'local',
        pin: false,
        isBase: storageModelList.value.length === 0,
        comparePosition: (storageModelList.value.length >= 2 ? 0 : storageModelList.value.length + 1) as 0 | 1 | 2
      }
    } else {
      return {
        ...info,
        documentId: '',
        type: 'online',
        pin: false,
        isBase: storageModelList.value.length === 0,
        comparePosition: (storageModelList.value.length >= 2 ? 0 : storageModelList.value.length + 1) as 0 | 1 | 2
      }
    }
  }

  const addModelToCompare = (model: StorageModel) => {
    console.log(model.id)
    const exists = storageModelList.value.find((item) => {
      if (model.type === 'local') {
        return item.fileId === model.fileId
      } else {
        return item.configName === model.configName
      }
    })
    if (storageModelList.value.length >= 4) {
      storageModelList.value.length = 4
      throw new Error('最多只能对比4个模型')
    }
    if (!exists) {
      storageModelList.value.push(model)
    } else {
      storageModelList.value.splice(
        storageModelList.value.findIndex((item) => {
          return item.configName === model.configName
        }),
        1,
        model
      )
    }

    console.log('storageModelList.value', storageModelList.value)
  }

  return {
    getAddModelInfo,
    addModelToCompare,
    storageModelList
  }
}

export default useModelCompare
