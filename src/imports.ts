// Utilities

// Quick and dirty because ByteArray testing was causing the console to crash.
window.logCount = 100

window.limitedLog = (...args) => {
  if (window.logCount > 0) console.log(...args)
  window.logCount -= 1
}

export * from './General/ByteArrayEnums'
export * from './General/ByteArray'
export * from './mx/utils/Base64Encoder'
export * from './mx/utils/Base64Decoder'
export * from './General/Util'
export * from './General/Input'
export * from './General/LSOManager'
export * from './General/FpsCounter'
export * from './Game/ContactListener'
export * from './Game/ContactFilter'
export * from './Game/KeyPress'

// Game
// Graphics
export * from './Game/Graphics/Gradient'
export * from './Game/Graphics/b2DebugDraw'
export * from './Game/Graphics/Sky'
export * from './Game/Graphics/Resource'
export * from './Game/Draw'

// Globals
export * from './Game/Globals/ControllerGameGlobals'

// GUI
export * from './Gui/GuiButton'
export * from './Gui/GuiCheckBox'
export * from './Gui/GuiSlider'
export * from './Gui/GuiWindow'
export * from './Gui/GuiCombobox'
export * from './Gui/GuiComboboxItem'
export * from './Gui/GuiTextInput'
export * from './Gui/GuiTextArea'
export * from './Gui/DropDownMenu'
export * from './Gui/DropDownMenuItem'
export * from './Gui/GuiList'

// GUI Windows
export * from './Gui/DialogWindow'
export * from './Gui/LoadWindow'
export * from './Gui/TutorialSelectWindow'
export * from './Gui/TutorialWindow'
export * from './Gui/AdvancedSandboxWindow'
export * from './Gui/ImportWindow'
export * from './Gui/ExportWindow'
export * from './Gui/MainEditPanel'
export * from './Gui/PartEditWindow'
export * from './Gui/ColourChangeWindow'
export * from './Gui/ScoreWindow'
export * from './Gui/PostReplayWindow'
export * from './Gui/ConditionsWindow'
export * from './Gui/RestrictionsWindow'

// Game Core
export * from './Game/SandboxSettings'
export * from './Game/Challenge'
export * from './Game/Robot'
export * from './Game/Replay'
export * from './Game/ReplaySyncPoint'
export * from './Game/CameraMovement'

// Controllers
export * from './Game/Controller'
export * from './Game/ControllerGame'
export * from './Game/ControllerMainMenu'
export * from './Game/ControllerSandbox'
export * from './Game/ControllerChallenge'
export * from './Game/Challenges/ControllerClimb'
export * from './Game/Challenges/ControllerSpaceship'
export * from './Game/Challenges/ControllerRace'
export * from './Game/Challenges/ControllerMonkeyBars'
export * from './Game/Tutorials/ControllerTutorial'
export * from './Game/Tutorials/ControllerShapes'
export * from './Game/Tutorials/ControllerCar'
export * from './Game/Tutorials/ControllerTank'
export * from './Game/Tutorials/ControllerJumpbot'
export * from './Game/Tutorials/ControllerDumpbot'
export * from './Game/Tutorials/ControllerCatapult'
export * from './Game/Tutorials/ControllerRubeGoldberg'
export * from './Game/Tutorials/ControllerHomeMovies'
export * from './Game/Tutorials/ControllerChallengeEditor'
export * from './Game/Tutorials/ControllerNewFeatures'
export * from './General/Database'

// Conditions
export * from './Game/Condition'
export * from './Game/LossCondition'
export * from './Game/WinCondition'

// Parts
export * from './Parts/Part'
export * from './Parts/ShapePart'
export * from './Parts/JointPart'
export * from './Parts/Circle'
export * from './Parts/Rectangle'
export * from './Parts/Triangle'
export * from './Parts/Cannon'
export * from './Parts/TextPart'
export * from './Parts/FixedJoint'
export * from './Parts/RevoluteJoint'
export * from './Parts/PrismaticJoint'
export * from './Parts/Thrusters'

// Actions
export * from './Actions/Action'
export * from './Actions/CreateAction'
export * from './Actions/MoveAction'
export * from './Actions/MoveZAction'
export * from './Actions/RotateAction'
export * from './Actions/ResizeShapesAction'
export * from './Actions/DeleteAction'
export * from './Actions/ClearAction'
export * from './Actions/LimitChangeAction'
export * from './Actions/ControlKeyAction'
export * from './Actions/CameraAction'
export * from './Actions/ChangeSliderAction'
export * from './Actions/TextSizeChangeAction'
export * from './Actions/TextCheckboxAction'
export * from './Actions/MassCreateAction'
export * from './Actions/JointCheckboxAction'
export * from './Actions/ResizeTextAction'
export * from './Actions/ColourChangeAction'
export * from './Actions/ShapeCheckboxAction'
export * from './Actions/EnterTextAction'
export * from './Actions/MultiColourChangeAction'
export * from './Actions/MultiCollideAction'
export * from './Actions/MultiOutlineAction'
export * from './Actions/MultiUndragableAction'
export * from './Actions/MultiFixateAction'
export * from './Actions/MultiTerrainAction'

export * from './Main'