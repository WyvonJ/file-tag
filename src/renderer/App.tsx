import { Tabs } from 'antd';
// import { Outlet, useNavigate } from 'react-router-dom';
import FileManager from './pages/FileManager';
import TagManager from './pages/TagManager';
import TagFiles from './pages/TagFiles';
import ConfigManager from './pages/ConfigManager';
// import { useNavigate } from "react-router-dom";
import './App.scss';
import './styles/index.scss';

const { TabPane } = Tabs;

function App() {
  // const navigate = useNavigate();
  // function handlerTabChange(tab) {
  //   navigate(`/${tab}`);
  // }
  return (
    <>
      <Tabs defaultActiveKey="FileManager" type="card">
        <TabPane tab="标签文件" key="TagFiles">
          <TagFiles />
        </TabPane>
        <TabPane tab="文件管理" key="FileManager">
          <FileManager />
        </TabPane>
        <TabPane tab="标签管理" key="TagManager">
          <TagManager />
        </TabPane>
        <TabPane tab="配置管理" key="ConfigManager">
          <ConfigManager />
        </TabPane>
      </Tabs>
      {/*<Outlet />*/}
    </>
  );
}

export default App;
