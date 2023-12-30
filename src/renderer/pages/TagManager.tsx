import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Table,
  TablePaginationConfig,
} from 'antd';
import { db, FtTag, PageParams } from '../database';
import iconList from '../config/iconList.json';
import colorList from '../config/colorList.json';
import MaterialIcon from '../components/MaterialIcon';
import Tag from '../components/Tag';
import './TagManager.scss';

const { useForm } = Form;
const { Option } = Select;

/**
 * 标签管理器
 * @returns
 */
const TagManager = () => {
  // 弹窗显示
  const [modalVisible, setModalVisible] = useState(false);
  // 表单绑定值
  const [formValues, setFormValues] = useState<FtTag>({
    name: '',
    color: 'red',
    icon: '',
    priority: 0,
  });
  // 分页参数
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  // 表格数据
  const [tableData, setTableData] = useState<Array<FtTag>>([]);

  async function getTagPage(page: PageParams) {
    try {
      const { list, total } = await db.getTagPage(page);
      console.log('getTagPage', list);
      setTableData(list);
      setPagination({
        current: page.page,
        pageSize: page.size,
        total,
      });
    } catch (e) {}
  }

  // 表单操作实例
  const [form] = useForm<FtTag>();

  async function handlerAdd(values: FtTag) {
    try {
      await db.addTag(values);
      message.success('创建标签成功');
      reloadTableData();
    } catch (e) {
      message.error('创建标签失败');
    }
  }

  function handlerDel(tag: FtTag) {
    Modal.confirm({
      title: '注意',
      centered: true,
      content: '是否确认删除该标签？',
      onOk: async () => {
        await db.ftTag.delete(tag.id as number);
        reloadTableData();
        message.success('删除标签成功');
      },
    });
  }

  async function handlerEdit(values: FtTag) {
    if (!values?.id) {
      message.error('请选择标签');
      return;
    }
    await db.updateTag(values);
    reloadTableData();
    message.success('修改标签成功');
  }

  async function handlerClickTag(tag: FtTag) {
    setFormValues(tag);
    form.setFieldsValue(tag);
    setModalVisible(true);
  }

  async function handlerSubmit() {
    const valid = await form.validateFields();
    if (!valid) {
      return;
    }
    if (formValues.id) {
      await handlerEdit(formValues);
    } else {
      await handlerAdd(formValues);
    }
    setModalVisible(false);
  }

  function handlerValuesChange(_value: any, values: FtTag) {
    setFormValues({
      ...values,
      id: formValues.id,
    });
  }

  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      render: (_all: any, _record: FtTag, index: number) =>
        ((pagination.current || 1) - 1) * (pagination.pageSize || 10) +
        index +
        1,
    },
    {
      title: '预览',
      dataIndex: 'preview',
      render: (_all: any, { color, icon, name }: FtTag) => (
        <Tag color={color} icon={icon} name={name} closable={false} />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: '颜色',
      dataIndex: 'color',
    },
    {
      title: '图标',
      dataIndex: 'icon',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
    },
    {
      title: '描述',
      dataIndex: 'desc',
    },
    {
      title: '操作',
      dataIndex: 'operate',
      render: (_all: any, record: FtTag) => {
        return (
          <>
            <Button
              shape="round"
              type="primary"
              onClick={() => handlerClickTag(record)}
              style={{ marginRight: '12px' }}
            >
              <MaterialIcon icon="edit" />
            </Button>
            <Button
              shape="round"
              danger={true}
              onClick={() => handlerDel(record)}
            >
              <MaterialIcon icon="delete" />
            </Button>
          </>
        );
      },
    },
  ];

  function handlerTableChange({ current, pageSize }: TablePaginationConfig) {
    getTagPage({
      page: current || 1,
      size: pageSize || 10,
    });
  }

  function reloadTableData() {
    getTagPage({
      page: pagination.current || 1,
      size: pagination.pageSize || 10,
    });
  }

  useEffect(() => {
    reloadTableData();
  }, []);

  return (
    <div className="tag-manager">
      <div
        style={{
          margin: 12,
        }}
      >
        <Button
          type="primary"
          shape="round"
          size="large"
          onClick={() => {
            const initialValues = {
              name: '',
              color: 'red',
              icon: 'api',
              priority: 0,
              desc: '',
            };
            setFormValues(initialValues);
            form.setFieldsValue(initialValues);
            setModalVisible(true);
          }}
        >
          <MaterialIcon icon="add" />
          <span className="btn-text">新增</span>
        </Button>
        <Button
          type="default"
          shape="round"
          size="large"
          onClick={() => {
            reloadTableData();
          }}
          style={{
            marginLeft: '24px',
          }}
        >
          <MaterialIcon icon="refresh" />
          <span className="btn-text">刷新</span>
        </Button>
      </div>

      <Table
        columns={columns}
        rowKey="id"
        onChange={(p) => handlerTableChange(p)}
        dataSource={tableData}
        pagination={pagination}
      ></Table>

      <Modal
        visible={modalVisible}
        title={formValues.id ? '修改' : '新增'}
        onCancel={() => setModalVisible(false)}
        onOk={handlerSubmit}
        centered={true}
        okText="提交"
        cancelText="取消"
        maskClosable={false}
      >
        <Form
          form={form}
          onValuesChange={handlerValuesChange}
          initialValues={formValues}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="请输入名称" maxLength={10} />
          </Form.Item>
          <Form.Item name="color" label="颜色" rules={[{ required: true }]}>
            <Select placeholder="请选择颜色">
              {colorList.map((color) => (
                <Option key={color} value={color} label={color}>
                  <Tag
                    className="select-tag"
                    color={color}
                    name={color}
                    icon="home"
                  />
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="icon" label="图标" rules={[{ required: true }]}>
            <Select placeholder="请选择图标">
              {iconList.slice(100, 200).map((icon) => (
                <Option key={icon} value={icon} label={icon}>
                  <MaterialIcon icon={icon} />
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true }]}
          >
            <InputNumber placeholder="请输入优先级" />
          </Form.Item>
          <Form.Item name="desc" label="描述">
            <Input.TextArea placeholder="请输入描述" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManager;
