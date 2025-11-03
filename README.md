# 香港智慧商圈平台

一个基于 Vue 3 + CesiumJS + TypeScript 的三维智慧商圈可视化平台。
本项目实现了城市空间分析、POI 交互搜索、热力图展示、骑手配送轨迹仿真等功能，支持多源地理数据加载与交互分析。

功能展示
1.Cesium 三维底图加载（Mapbox、Cesium Ion支持）
2.空间搜索模块：圆形范围内 OSM 建筑提取与高亮
3.人流热力图：按时段动态计算与渲染
4.外卖骑手路径仿真：模拟多订单组合派送
5.可视化面板：ECharts 动态展示配送效率、人流趋势等
6.IndexedDB 数据持久化：离线存储与场景回显
7.场景管理与还原：摄像机位置、路径状态恢复

技术栈
前端框架：Vue 3 (Composition API)
地图引擎：CesiumJS
可视化库：ECharts, DataV,Element Plus
类型支持：TypeScript
状态管理：Pinia
构建工具：Vite
数据存储：IndexedDB\localStorage\sessionStorage
地理计算：Turf.js
