import { Observable } from 'rxjs'
import { load, save } from './localStorage'

const SAVE_SUCCESS = 'DatabaseSaveSuccessEvent'
const SAVE_FAIL = 'DatabaseSaveFailEvent'

let id = 0

class Database {

  constructor(initialState) {
    this.id = id
    id += 1
    this.initialState = initialState
    this.fetchData = this.fetchData.bind(this)
    this.setData = this.setData.bind(this)
  }

  fetchData() {
    return load(this.id) || this.initialState
  }

  setData(newData) {
    try {
      save(this.id, newData)
      window.dispatchEvent(
        new CustomEvent(SAVE_SUCCESS, { detail: newData })
      )
      // stub aragonAPI interface
      return new Observable(subscriber => subscriber.complete())
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent(SAVE_FAIL))
    }
  }

  subscribe(func) {
    window.addEventListener(SAVE_SUCCESS, func, false)
  }

  unsubscribe(func) {
    window.removeEventListener(SAVE_SUCCESS, func, false)
  }

}

export default ({initialState}) => new Database(initialState)
