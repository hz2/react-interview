import { UIEventHandler, useEffect, useState } from 'react'
import './App.css'
import "./App.less";


interface IRow {
  [key: string]: string | number
}
interface IGroupObj {
  [key: string]: IRow[]
}
interface IGroupItem {
  key: string
  open: boolean
  list: IRow[]
}

// 调用接口
export const req = async (params: object) => {
  try {
    const r = await fetch('/api/prod/mock/meeting-c/list?' + new URLSearchParams(params as URLSearchParams), {
      method: 'get',
      headers: {
        'content-type': 'application/json'
      },
    })
      .then(r => r.json());

    const { data, code } = r;
    if (code === 0) {
      return data
    } else {
      return r
    }
  } catch (error) {
    console.error('===error===', error);
  }
}

// 处理日期并按照日期分组
const genDate = (arr: IRow[]): IGroupItem[] => {
  const parseLocTime = (num: number) => new Date(num).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
  const listOrig = (arr || []).filter(x => x).map(x => ({
    ...x,
    date: new Date(x.create_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    start: parseLocTime(Number(x.create_time)),
    end: parseLocTime(Number(x.create_time) + Number(x.duration) * 1000)
  }))

  const groupObj = listOrig.reduce((c: IGroupObj, x, i) => {
    const key = x.date;
    let arr = c[key]
    if (arr) {
      arr.push(x)
    } else {
      arr = [x]
    }
    c[key] = arr;
    return c
  }, {})
  const groupArr = Object.entries(groupObj).map(([key, list]) => ({ key, list, open: false }));
  return groupArr
}

// 节流
var throttleTimer: boolean;
const throttle = (callback: Function, time: number) => {
  if (throttleTimer) return;

  throttleTimer = true;

  setTimeout(() => {
    callback();
    throttleTimer = false;
  }, time);
};


function App() {
  const [count, setCount] = useState(0);
  // 渲染的列表
  const [list, setList] = useState<IGroupItem[]>([]);
  // 记录展开的项的状态
  const [openList, setOpenList] = useState<boolean[]>([]);
  // 当前页数
  const [page, setPage] = useState(1)

  useEffect(() => {
    req({
      page_now: page,
      page_size: 10

    }).then(r => {
      setList(genDate(r.list));
    })
  }, [])


  // 这个模拟数据有问题，不管每页多少条，永远都是一页一天的数据

  // 加载状态
  const [loading, setLoading] = useState(false);
  // 没有更多数据
  const [isEnd, setIsEnd] = useState(false)

  // 加载更多
  const loadMore = () => {
    if (loading) {
      return
    }
    if (isEnd) {
      console.log('end ');
      return
    }
    setLoading(true)
    setPage(page + 1)
    req({
      page_now: page,
      page_size: 10
    }).then(r => {
      setList(list.concat(genDate(r.list)));
      const { page_total } = r.page;
      if (page_total <= page) {
        setIsEnd(true)
      }
    }).finally(() => {
      setLoading(false)
    })

  }

  // 按照日期分组的展开
  const expandGroup = (i: number) => {
    const current = openList[i] || false
    openList[i] = !current
    setOpenList([...openList])
  }

  // 无限滚动

  const handleInfiniteScroll: UIEventHandler<HTMLElement> = (e) => {
    const { target } = e;
    const el = target as HTMLElement;
    const children = [...el.children] as HTMLElement[]

    const childrenHeight = children.reduce((c, x) => c + x.offsetHeight, 0) + 48;
    const elHeight = el.scrollTop + el.offsetHeight;
    const endOfPage = elHeight >= childrenHeight;

    console.log(' endOfPage ', childrenHeight, elHeight, endOfPage);

    if (endOfPage && !isEnd) {
      throttle(() => {
        loadMore()
      }, 1000);
    }
    // if (isEnd) {
    //   removeInfiniteScroll();
    // }
  }


  return (
    <div className="App">
      {
        loading ? <div className="mask">Loading...</div> : null
      }
      <aside onScroll={handleInfiniteScroll}>
        {
          list.map((x, i) =>
            <div className="date-item" key={'date-item' + i}>
              <div className={openList[i] ? 'open date-title' : 'date-title'} onClick={() => expandGroup(i)}>{x.key}</div>
              <div className="date-arr" style={{ height: openList[i] ? (x.list.length * (70 + 24)) : 0 }}>
                {
                  x.list.map((y, j) => <div className='list-item' key={'item' + j}>
                    <div className="title">{y.title}</div>
                    <div className="time">{y.start} - {y.end}</div>
                  </div>)
                }
              </div>
            </div>)
        }
      </aside>
    </div>
  )
}

export default App
