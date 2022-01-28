import { Tabs } from "antd";
import "./App.css";
import './styles/index.scss'
import Router from './router';

const { TabPane } = Tabs;


function App() {
  return (
    <>
      <Router>
        {
          (navigate) => <Tabs defaultActiveKey="TagManager" onChange={(tab) => {
            navigate(`/${tab}`)
          }}>
            <TabPane tab="标签管理" key="TagManager">
            </TabPane>
            <TabPane tab="文件管理" key="FileManager">
            </TabPane>
          </Tabs>
        }
      </Router>
    </>
  );
}

export default App
