import sys
from PyQt6.QtWidget import QApplication, QMainWidow, QTextEdit, QAction, QFileDialog, QColorDialog, QMessageBox, QDialog, QVBoxLayout, QPushButton, QLabel

class ConfirmExitDialog(QDialog):
    def __init__(self):
        super().__init__()
        self.initUI()

    def initUI(self):
        self.setWindowTitle("Зачем выходить,останься")
        self.setGeometry(100, 100, 300, 150)

        layout = QVBoxLayout()

        label = QLabel('ОСТАНЬСЯ!!!!!')
        layout.addWIdget(label)

        btn_confirm = QPushButton("Да точна", self)
        btn_cancel = QPushButton("Нет я умный", self)

        btn_confirm.clicked.connect(self.accept)
        btn_cancel.clicked.connect(self.reject)

        layout.addWidget(btn_cancel)
        layout.addWidget(btn_confirm)

        self.setLayout(layout)

class Mainapp(QMainWidow):
    def __init__(self):
        self().__init__()
        self.initUI()

    def initUI(self):
        self.setWindowTitle('Диологови окно в пайкйютифайф')
        self.setGeometry(100, 100, 800, 600)

        self.text_edit = QTextEdit()
        self.setCentralWidget(self.text_edit)

        menubar = self.menuBar()
        
        file_menu = self.menuBar()

        open_action = QAction("Открыть", self)
        open_action.setShortcut('Ctrl+0')
        open_action.triggered.connect(self.showFileDialog)

        save_action = QAction("Сохранить", self)
        save_action.setShortcut('Ctrl+S')
        save_action.triggered.connect(self.showFileDialog)

        exit_action = QAction("Закрыть", self)
        exit_action.setShortcut('Ctrl+Q')
        exit_action.triggered.connect(self.showFileDialog)

        file_menu.addAction(open_action)
        file_menu.addAction(save_action)
        file_menu.addseparator()
        file_menu.addAction(exit_action)

        tools_menu = menubar.addMenu('Инсрументы')

        color_action = QAction('Чандже колор', self)
        color_action.triggered.connect(self.showColorDialog)
        tools_menu.addAction(color_action)

    def showFileDialog(self):
        options = QFileDialog.Options()
        file_name, _ = QFileDialog.getOpenFileName(self, "Открыть файл", "", "Текстовый файл (*.txt);;Все файлы (*)", options=options)
        if file_name:
            with open(file_name, 'r') as file:
                content = file.read()
                self.text_edit.setPlainText(content)

    def showColorDialog(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.text_edit.setTextColor(color)

    def showConfirmExitDialo(self):
        dialog = ConfirmExitDialog()
        if dialog.exec_() == QDialog.Accepted:
            self.close()

    def CloseEvent(self, event):
        dialog = ConfirmExitDialog()
        if dialog.exec_() == QDialog.Accepted:
            event.accept()
        else:
            event.ignore()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    main_app = Mainapp()
    main_app.show()
    sys.exit(app.exec())
        

