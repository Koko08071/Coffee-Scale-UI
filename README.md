
  # Smart Coffee Scale UI Design

  这款智能咖啡秤，以“智能曲线指导”为核心卖点功能，旨在辅助手冲爱好者复刻出一杯满意的手冲咖啡
# 日常称重主界面
<img width="1346" height="819" alt="image" src="https://github.com/user-attachments/assets/f37eb2b7-66e9-487a-a870-f8864c41c557" />

# 复刻曲线界面
<img width="1346" height="819" alt="image" src="https://github.com/user-attachments/assets/0be1aa34-f72a-43fb-91d6-f406d93ac452" />
<img width="1346" height="819" alt="image" src="https://github.com/user-attachments/assets/be7c6cf6-1b3f-481f-965f-3c7d828dd55c" />

# 意式模式界面
<img width="1390" height="819" alt="image" src="https://github.com/user-attachments/assets/7a75e4e5-2347-4cee-9452-efe03c862c08" />


# UI交互逻辑图
<img width="6870" height="4828" alt="image" src="https://github.com/user-attachments/assets/eaf84cbc-072f-4f5b-9652-f7c16b251533" />

# 按键操作逻辑

秤体主体设置四个输入控件：左侧矩形电容式计时键/称量保存键、右上电容式菜单/返回键、右下旋钮按键以及X瞬时快捷键。

- X快捷键：采用非自锁瞬时按键，仅配置快捷进入的目标模式。

- （左侧）电容式计时键：日常称重时单击开始/暂停计时；冲煮记录时单击开始/结束计时，不支持暂停；称量页面单击保存当前稳定的咖啡重量并返回确认配方页，称豆页面不执行计时清零。长按1.5秒清零计时。功能固定，不支持自定义。

- （右侧）电容式菜单/返回键：主页面单击进入菜单；菜单内单击返回上一级。功能固定，不支持自定义。

- 旋钮：在称重主页面/冲煮准备状态单击去皮，正式冲煮开始后自动锁定去皮功能，避免误操作导致重量归零，在菜单中单击确认，旋转用于选择/调整/结果游标，长按2秒开机或关机；不支持用户自定义。

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
