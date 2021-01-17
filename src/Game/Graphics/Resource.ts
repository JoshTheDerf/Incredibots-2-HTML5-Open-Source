import { Application, Texture } from "pixi.js";
import PIXIsound from "pixi-sound";

// Data
import cRobot from "../../../resource/robot.dat";
import cReplay from "../../../resource/replay.dat";
import cSpaceship from "../../../resource/spaceship.dat";
import cRace from "../../../resource/race.dat";

// Sounds
import cRoll from "../../../resource/roll_01.mp3";
import cClick from "../../../resource/click_02.mp3";
import cShape1 from "../../../resource/create_shape_1.mp3";
import cShape2 from "../../../resource/create_shape_2.mp3";
import cShape3 from "../../../resource/create_shape_3.mp3";
import cShape4 from "../../../resource/create_shape_4.mp3";
import cShape5 from "../../../resource/create_shape_5.mp3";
import cJoint1 from "../../../resource/create_joint_1.mp3";
import cJoint2 from "../../../resource/create_joint_2.mp3";
import cJoint3 from "../../../resource/create_joint_3.mp3";
import cJoint4 from "../../../resource/create_joint_4.mp3";
import cJoint5 from "../../../resource/create_joint_5.mp3";
import cIntro from "../../../resource/Incredibots_Intro.mp3";
import cWin from "../../../resource/Incredibots_Win_r1.mp3";
import cLose from "../../../resource/Incredibots_Lose_r2.mp3";

// Main Menu Resources
import cMainMenuLogo from "../../../resource/incredibots2_logo.png";

// Level Select Resources
import cLevelSelectBox1L from "../../../resource/levelselect_box_1_L.png";
import cLevelSelectBox1M from "../../../resource/levelselect_box_1_M.png";
import cLevelSelectBox1R from "../../../resource/levelselect_box_1_R.png";
import cLevelSelectBox2L from "../../../resource/levelselect_box_2_L.png";
import cLevelSelectBox2M from "../../../resource/levelselect_box_2_M.png";
import cLevelSelectBox2R from "../../../resource/levelselect_box_2_R.png";
import cLevelSelectOtherBoxL from "../../../resource/levelselect_box_other_L.png";
import cLevelSelectOtherBoxM from "../../../resource/levelselect_box_other_M.png";
import cLevelSelectOtherBoxR from "../../../resource/levelselect_box_other_R.png";
import cLevelSelectLevelCheckBoxA from "../../../resource/levelselect_checkbox_levels_A.png";
import cLevelSelectLevelCheckBoxB from "../../../resource/levelselect_checkbox_levels_B.png";
import cLevelSelectStartHereText from "../../../resource/levelselect_starthere_text.png";
import cLevelSelectStartHereArrow from "../../../resource/levelselect_starthere_arrow.png";

// Button Resources
import cGuiButtonRedBase from "../../../resource/button_red_base.png";
import cGuiButtonRedRoll from "../../../resource/button_red_roll.png";
import cGuiButtonRedClick from "../../../resource/button_red_click.png";
import cGuiButtonPurpleBase from "../../../resource/button_purple_base.png";
import cGuiButtonPurpleRoll from "../../../resource/button_purple_roll.png";
import cGuiButtonPurpleClick from "../../../resource/button_purple_click.png";
import cGuiButtonBlueBase from "../../../resource/button_blue_base.png";
import cGuiButtonBlueRoll from "../../../resource/button_blue_roll.png";
import cGuiButtonBlueClick from "../../../resource/button_blue_click.png";
import cGuiButtonPinkBase from "../../../resource/button_pink_base.png";
import cGuiButtonPinkRoll from "../../../resource/button_pink_roll.png";
import cGuiButtonPinkClick from "../../../resource/button_pink_click.png";
import cGuiButtonOrangeBase from "../../../resource/button_orange_base.png";
import cGuiButtonOrangeRoll from "../../../resource/button_orange_roll.png";
import cGuiButtonOrangeClick from "../../../resource/button_orange_click.png";
import cGuiButtonPlayBase from "../../../resource/button_play_base.png";
import cGuiButtonPlayRoll from "../../../resource/button_play_roll.png";
import cGuiButtonPlayClick from "../../../resource/button_play_click.png";
import cGuiButtonXBase from "../../../resource/button_X_base.png";
import cGuiButtonXRoll from "../../../resource/button_X_roll.png";
import cGuiButtonXClick from "../../../resource/button_X_click.png";

// GUI window resources
import cGuiWindowTop120 from "../../../resource/box120_top.png";
import cGuiWindowBottom120 from "../../../resource/box120_bot.png";
import cGuiWindowMid120 from "../../../resource/box120_mid.png";
import cGuiWindowTop154 from "../../../resource/box154_top.png";
import cGuiWindowBottom154 from "../../../resource/box154_bot.png";
import cGuiWindowMid154 from "../../../resource/box154_mid.png";
import cGuiWindowTop200 from "../../../resource/box200_top.png";
import cGuiWindowBottom200 from "../../../resource/box200_bot.png";
import cGuiWindowMid200 from "../../../resource/box200_mid.png";
import cGuiWindowTop248 from "../../../resource/box248_top.png";
import cGuiWindowBottom248 from "../../../resource/box248_bot.png";
import cGuiWindowMid248 from "../../../resource/box248_mid.png";
import cGuiWindowTop547 from "../../../resource/box547_top.png";
import cGuiWindowBottom547 from "../../../resource/box547_bot.png";
import cGuiWindowMid547 from "../../../resource/box547_mid.png";
import cGuiWindowLeft800 from "../../../resource/topbox_left.png";
import cGuiWindowRight800 from "../../../resource/topbox_right.png";
import cGuiWindowMid800 from "../../../resource/topbox_mid.png";
import cGuiWindowLeft600 from "../../../resource/chall_ed_restrictions_box_L.png";
import cGuiWindowRight600 from "../../../resource/chall_ed_restrictions_box_R.png";
import cGuiWindowMid600 from "../../../resource/chall_ed_restrictions_box_M.png";
import cGuiWindowLeft700 from "../../../resource/chall_ed_winloss_box_L.png";
import cGuiWindowRight700 from "../../../resource/chall_ed_winloss_box_R.png";
import cGuiWindowMid700 from "../../../resource/chall_ed_winloss_box_M.png";
import cGuiWindowLinebox from "../../../resource/chall_ed_winloss_box_linebox.png";
import cGuiWindowLine from "../../../resource/chall_ed_winloss_box_linehoriz.png";

// Drop down menu resources
import cGuiMenuBar from "../../../resource/menubar.png";
import cGuiMenuBarRoll from "../../../resource/menubar_roll.png";
import cGuiMenuCheckBoxABase from "../../../resource/menubox_chkboxA_base.png";
import cGuiMenuCheckBoxARoll from "../../../resource/menubox_chkboxA_roll.png";
import cGuiMenuCheckBoxAClick from "../../../resource/menubox_chkboxA_click.png";
import cGuiMenuCheckBoxBBase from "../../../resource/menubox_chkboxB_base.png";
import cGuiMenuCheckBoxBRoll from "../../../resource/menubox_chkboxB_roll.png";
import cGuiMenuCheckBoxBClick from "../../../resource/menubox_chkboxB_click.png";

// GUI Check box resources
import cGuiCheckboxABase from "../../../resource/chkboxA_base.png";
import cGuiCheckboxARoll from "../../../resource/chkboxA_roll.png";
import cGuiCheckboxAClick from "../../../resource/chkboxA_click.png";
import cGuiCheckboxADisabled from "../../../resource/chkboxA_disabled.png";
import cGuiCheckboxBBase from "../../../resource/chkboxB_base.png";
import cGuiCheckboxBRoll from "../../../resource/chkboxB_roll.png";
import cGuiCheckboxBClick from "../../../resource/chkboxB_click.png";
import cGuiCheckboxBDisabled from "../../../resource/chkboxB_disabled.png";

// GUI text area resources
import cGuiTextAreaBase from "../../../resource/txtbox_base.png";
import cGuiTextAreaRoll from "../../../resource/txtbox_roll.png";
import cGuiTextAreaDisabled from "../../../resource/txtbox_base_disabled.png";

// // GUI Combo box resources
import cGuiComboboxBase from "../../../resource/button_purplearrow_base.png";
import cGuiComboboxRoll from "../../../resource/button_purplearrow_roll.png";
import cGuiComboboxClick from "../../../resource/button_purplearrow_click.png";

// // GUI List box resources
import cGuiListboxBase from "../../../resource/listboxentry_base.png";
import cGuiListboxRoll from "../../../resource/listboxentry_roll.png";
import cGuiListboxClick from "../../../resource/listboxentry_active.png";
import cGuiListboxWideBase from "../../../resource/listboxentry_wide_base.png";
import cGuiListboxWideRoll from "../../../resource/listboxentry_wide_roll.png";
import cGuiListboxWideClick from "../../../resource/listboxentry_wide_active.png";

// GUI Slider resources
import cGuiSliderGroove from "../../../resource/slider_groove.png";
import cGuiSliderGrooveDisabled from "../../../resource/slider_groove_disabled.png";
import cGuiSliderThumb from "../../../resource/slider_arrow.png";

// // Cloud resources
import cCloud0 from "../../../resource/cloud_0.png";
import cCloud1 from "../../../resource/cloud_1.png";
import cCloud2 from "../../../resource/cloud_2.png";
import cCloud3 from "../../../resource/cloud_3.png";
import cCloud4 from "../../../resource/cloud_4.png";
import cCloud5 from "../../../resource/cloud_5.png";
import cCloud6 from "../../../resource/cloud_6.png";
import cCloud7 from "../../../resource/cloud_7.png";
import cCloud8 from "../../../resource/cloud_8.png";
import cCloud9 from "../../../resource/cloud_9.png";

export class MouseCursor {
  // Css style for icons
  defaultIcon = "url('resource/mouse_pointer.png'),auto";
  hoverIcon = "url('resource/mopuse_hourglass.png'),auto";

  apply(application: Application) {
    // Add custom cursor styles
    application.renderer.plugins.interaction.cursorStyles.default = this.defaultIcon;
    application.renderer.plugins.interaction.cursorStyles.hover = this.hoverIcon;
  }
}

export class Resource {
  static paths = {
    cReplay: cReplay,
    cRobot: cRobot,
    cSpaceship: cSpaceship,
    cRace: cRace,
  };

  static textures = {
    cMainMenuLogo: cMainMenuLogo,
    cLevelSelectBox1L: cLevelSelectBox1L,
    cLevelSelectBox1M: cLevelSelectBox1M,
    cLevelSelectBox1R: cLevelSelectBox1R,
    cLevelSelectBox2L: cLevelSelectBox2L,
    cLevelSelectBox2M: cLevelSelectBox2M,
    cLevelSelectBox2R: cLevelSelectBox2R,
    cLevelSelectOtherBoxL: cLevelSelectOtherBoxL,
    cLevelSelectOtherBoxM: cLevelSelectOtherBoxM,
    cLevelSelectOtherBoxR: cLevelSelectOtherBoxR,
    cLevelSelectLevelCheckBoxA: cLevelSelectLevelCheckBoxA,
    cLevelSelectLevelCheckBoxB: cLevelSelectLevelCheckBoxB,
    cLevelSelectStartHereText: cLevelSelectStartHereText,
    cLevelSelectStartHereArrow: cLevelSelectStartHereArrow,

    // Button resources
    cGuiButtonRedBase: cGuiButtonRedBase,
    cGuiButtonRedRoll: cGuiButtonRedRoll,
    cGuiButtonRedClick: cGuiButtonRedClick,
    cGuiButtonPurpleBase: cGuiButtonPurpleBase,
    cGuiButtonPurpleRoll: cGuiButtonPurpleRoll,
    cGuiButtonPurpleClick: cGuiButtonPurpleClick,
    cGuiButtonBlueBase: cGuiButtonBlueBase,
    cGuiButtonBlueRoll: cGuiButtonBlueRoll,
    cGuiButtonBlueClick: cGuiButtonBlueClick,
    cGuiButtonPinkBase: cGuiButtonPinkBase,
    cGuiButtonPinkRoll: cGuiButtonPinkRoll,
    cGuiButtonPinkClick: cGuiButtonPinkClick,
    cGuiButtonOrangeBase: cGuiButtonOrangeBase,
    cGuiButtonOrangeRoll: cGuiButtonOrangeRoll,
    cGuiButtonOrangeClick: cGuiButtonOrangeClick,
    cGuiButtonPlayBase: cGuiButtonPlayBase,
    cGuiButtonPlayRoll: cGuiButtonPlayRoll,
    cGuiButtonPlayClick: cGuiButtonPlayClick,
    cGuiButtonXBase: cGuiButtonXBase,
    cGuiButtonXRoll: cGuiButtonXRoll,
    cGuiButtonXClick: cGuiButtonXClick,

    // Window resources
    cGuiWindowTop120: cGuiWindowTop120,
    cGuiWindowBottom120: cGuiWindowBottom120,
    cGuiWindowMid120: cGuiWindowMid120,
    cGuiWindowTop154: cGuiWindowTop154,
    cGuiWindowBottom154: cGuiWindowBottom154,
    cGuiWindowMid154: cGuiWindowMid154,
    cGuiWindowTop200: cGuiWindowTop200,
    cGuiWindowBottom200: cGuiWindowBottom200,
    cGuiWindowMid200: cGuiWindowMid200,
    cGuiWindowTop248: cGuiWindowTop248,
    cGuiWindowBottom248: cGuiWindowBottom248,
    cGuiWindowMid248: cGuiWindowMid248,
    cGuiWindowTop547: cGuiWindowTop547,
    cGuiWindowBottom547: cGuiWindowBottom547,
    cGuiWindowMid547: cGuiWindowMid547,
    cGuiWindowLeft800: cGuiWindowLeft800,
    cGuiWindowRight800: cGuiWindowRight800,
    cGuiWindowMid800: cGuiWindowMid800,
    cGuiWindowLeft600: cGuiWindowLeft600,
    cGuiWindowRight600: cGuiWindowRight600,
    cGuiWindowMid600: cGuiWindowMid600,
    cGuiWindowLeft700: cGuiWindowLeft700,
    cGuiWindowRight700: cGuiWindowRight700,
    cGuiWindowMid700: cGuiWindowMid700,
    cGuiWindowLinebox: cGuiWindowLinebox,
    cGuiWindowLine: cGuiWindowLine,

    // Drop down menu resources
    cGuiMenuBar: cGuiMenuBar,
    cGuiMenuBarRoll: cGuiMenuBarRoll,
    cGuiMenuCheckBoxABase: cGuiMenuCheckBoxABase,
    cGuiMenuCheckBoxARoll: cGuiMenuCheckBoxARoll,
    cGuiMenuCheckBoxAClick: cGuiMenuCheckBoxAClick,
    cGuiMenuCheckBoxBBase: cGuiMenuCheckBoxBBase,
    cGuiMenuCheckBoxBRoll: cGuiMenuCheckBoxBRoll,
    cGuiMenuCheckBoxBClick: cGuiMenuCheckBoxBClick,

    // GUI Check box resources
    cGuiCheckboxABase: cGuiCheckboxABase,
    cGuiCheckboxARoll: cGuiCheckboxARoll,
    cGuiCheckboxAClick: cGuiCheckboxAClick,
    cGuiCheckboxADisabled: cGuiCheckboxADisabled,
    cGuiCheckboxBBase: cGuiCheckboxBBase,
    cGuiCheckboxBRoll: cGuiCheckboxBRoll,
    cGuiCheckboxBClick: cGuiCheckboxBClick,
    cGuiCheckboxBDisabled: cGuiCheckboxBDisabled,

    // GUI text area resources
    cGuiTextAreaBase: cGuiTextAreaBase,
    cGuiTextAreaRoll: cGuiTextAreaRoll,
    cGuiTextAreaDisabled: cGuiTextAreaDisabled,

    // GUI Combobox resources
    cGuiComboboxBase: cGuiComboboxBase,
    cGuiComboboxRoll: cGuiComboboxRoll,
    cGuiComboboxClick: cGuiComboboxClick,

    // GUI Listbox resources
    cGuiListboxBase: cGuiListboxBase,
    cGuiListboxRoll: cGuiListboxRoll,
    cGuiListboxClick: cGuiListboxClick,
    cGuiListboxWideBase: cGuiListboxWideBase,
    cGuiListboxWideRoll: cGuiListboxWideRoll,
    cGuiListboxWideClick: cGuiListboxWideClick,

    // GUI Slider resources
    cGuiSliderGroove: cGuiSliderGroove,
    cGuiSliderGrooveDisabled: cGuiSliderGrooveDisabled,
    cGuiSliderThumb: cGuiSliderThumb,

    // Cloud resources
    cCloud0: cCloud0,
    cCloud1: cCloud1,
    cCloud2: cCloud2,
    cCloud3: cCloud3,
    cCloud4: cCloud4,
    cCloud5: cCloud5,
    cCloud6: cCloud6,
    cCloud7: cCloud7,
    cCloud8: cCloud8,
    cCloud9: cCloud9,
  };

  // Sounds
  static cRoll = PIXIsound.Sound.from(cRoll);
  static cClick = PIXIsound.Sound.from(cClick);
  static cShape1 = PIXIsound.Sound.from(cShape1);
  static cShape2 = PIXIsound.Sound.from(cShape2);
  static cShape3 = PIXIsound.Sound.from(cShape3);
  static cShape4 = PIXIsound.Sound.from(cShape4);
  static cShape5 = PIXIsound.Sound.from(cShape5);
  static cJoint1 = PIXIsound.Sound.from(cJoint1);
  static cJoint2 = PIXIsound.Sound.from(cJoint2);
  static cJoint3 = PIXIsound.Sound.from(cJoint3);
  static cJoint4 = PIXIsound.Sound.from(cJoint4);
  static cJoint5 = PIXIsound.Sound.from(cJoint5);
  static cIntro = PIXIsound.Sound.from(cIntro);
  static cWin = PIXIsound.Sound.from(cWin);
  static cLose = PIXIsound.Sound.from(cLose);

  // Main menu resources
  static cReplay: any;
  static cRobot: any;
  static cMainMenuLogo: Texture;

  // Level select resources
  static cLevelSelectBox1L: Texture;
  static cLevelSelectBox1M: Texture;
  static cLevelSelectBox1R: Texture;
  static cLevelSelectBox2L: Texture;
  static cLevelSelectBox2M: Texture;
  static cLevelSelectBox2R: Texture;
  static cLevelSelectOtherBoxL: Texture;
  static cLevelSelectOtherBoxM: Texture;
  static cLevelSelectOtherBoxR: Texture;
  static cLevelSelectLevelCheckBoxA: Texture;
  static cLevelSelectLevelCheckBoxB: Texture;
  static cLevelSelectStartHereText: Texture;
  static cLevelSelectStartHereArrow: Texture;

  // Button resources
  static cGuiButtonRedBase: Texture;
  static cGuiButtonRedRoll: Texture;
  static cGuiButtonRedClick: Texture;
  static cGuiButtonPurpleBase: Texture;
  static cGuiButtonPurpleRoll: Texture;
  static cGuiButtonPurpleClick: Texture;
  static cGuiButtonBlueBase: Texture;
  static cGuiButtonBlueRoll: Texture;
  static cGuiButtonBlueClick: Texture;
  static cGuiButtonPinkBase: Texture;
  static cGuiButtonPinkRoll: Texture;
  static cGuiButtonPinkClick: Texture;
  static cGuiButtonOrangeBase: Texture;
  static cGuiButtonOrangeRoll: Texture;
  static cGuiButtonOrangeClick: Texture;
  static cGuiButtonPlayBase: Texture;
  static cGuiButtonPlayRoll: Texture;
  static cGuiButtonPlayClick: Texture;
  static cGuiButtonXBase: Texture;
  static cGuiButtonXRoll: Texture;
  static cGuiButtonXClick: Texture;

  // Window resources
  static cGuiWindowTop120: Texture;
  static cGuiWindowBottom120: Texture;
  static cGuiWindowMid120: Texture;
  static cGuiWindowTop154: Texture;
  static cGuiWindowBottom154: Texture;
  static cGuiWindowMid154: Texture;
  static cGuiWindowTop200: Texture;
  static cGuiWindowBottom200: Texture;
  static cGuiWindowMid200: Texture;
  static cGuiWindowTop248: Texture;
  static cGuiWindowBottom248: Texture;
  static cGuiWindowMid248: Texture;
  static cGuiWindowTop547: Texture;
  static cGuiWindowBottom547: Texture;
  static cGuiWindowMid547: Texture;
  static cGuiWindowLeft800: Texture;
  static cGuiWindowRight800: Texture;
  static cGuiWindowMid800: Texture;
  static cGuiWindowLeft600: Texture;
  static cGuiWindowRight600: Texture;
  static cGuiWindowMid600: Texture;
  static cGuiWindowLeft700: Texture;
  static cGuiWindowRight700: Texture;
  static cGuiWindowMid700: Texture;
  static cGuiWindowLinebox: Texture;
  static cGuiWindowLine: Texture;

  // Drop down menu resources
  static cGuiMenuBar: Texture;
  static cGuiMenuBarRoll: Texture;
  static cGuiMenuCheckBoxABase: Texture;
  static cGuiMenuCheckBoxARoll: Texture;
  static cGuiMenuCheckBoxAClick: Texture;
  static cGuiMenuCheckBoxBBase: Texture;
  static cGuiMenuCheckBoxBRoll: Texture;
  static cGuiMenuCheckBoxBClick: Texture;

  // GUI Check box resources
  static cGuiCheckboxABase: Texture;
  static cGuiCheckboxARoll: Texture;
  static cGuiCheckboxAClick: Texture;
  static cGuiCheckboxADisabled: Texture;
  static cGuiCheckboxBBase: Texture;
  static cGuiCheckboxBRoll: Texture;
  static cGuiCheckboxBClick: Texture;
  static cGuiCheckboxBDisabled: Texture;

  // GUI text area resources
  static cGuiTextAreaBase: Texture;
  static cGuiTextAreaRoll: Texture;
  static cGuiTextAreaDisabled: Texture;

  // GUI Combobox resources
  static cGuiComboboxBase: Texture;
  static cGuiComboboxRoll: Texture;
  static cGuiComboboxClick: Texture;

  // GUI Listbox resources
  static cGuiListboxBase: Texture;
  static cGuiListboxRoll: Texture;
  static cGuiListboxClick: Texture;
  static cGuiListboxWideBase: Texture;
  static cGuiListboxWideRoll: Texture;
  static cGuiListboxWideClick: Texture;

  // GUI Slider resources
  static cGuiSliderGroove: Texture;
  static cGuiSliderGrooveDisabled: Texture;
  static cGuiSliderThumb: Texture;

  // Cloud resources
  static cCloud0: Texture;
  static cCloud1: Texture;
  static cCloud2: Texture;
  static cCloud3: Texture;
  static cCloud4: Texture;
  static cCloud5: Texture;
  static cCloud6: Texture;
  static cCloud7: Texture;
  static cCloud8: Texture;
  static cCloud9: Texture;

  static async load() {
    const promises = [];
    for (const key in Resource.paths) {
      promises.push(
        fetch(Resource.paths[key])
          .then((res) => res.blob())
          .then((resource) => (Resource[key] = resource))
      );
    }

    for (const key in Resource.textures) {
      promises.push(Texture.fromURL(Resource.textures[key]).then((texture) => (Resource[key] = texture)));
    }

    await Promise.all(promises);
  }

  // // Mouse cursor resources
  // [Embed(source="/resource/mouse_pointer.png")] public static var cMouseCursor:Class;
  // [Embed(source="/resource/mouse_hourglass.png")] public static var cMouseHourglass:Class;

  // // Main menu resources
  // [Embed(source="/resource/incredibots2_logo.png")] public static var cMainMenuLogo:Class;
  // [Embed(source="/resource/Incredibots_Congratulations_1.png")] public static var cCongrats:Class;

  // // Level select resources
  // [Embed(source="/resource/levelselect_box_1_L.png")] public static var cLevelSelectBox1L:Class;
  // [Embed(source="/resource/levelselect_box_1_M.png")] public static var cLevelSelectBox1M:Class;
  // [Embed(source="/resource/levelselect_box_1_R.png")] public static var cLevelSelectBox1R:Class;
  // [Embed(source="/resource/levelselect_box_2_L.png")] public static var cLevelSelectBox2L:Class;
  // [Embed(source="/resource/levelselect_box_2_M.png")] public static var cLevelSelectBox2M:Class;
  // [Embed(source="/resource/levelselect_box_2_R.png")] public static var cLevelSelectBox2R:Class;
  // [Embed(source="/resource/levelselect_box_other_L.png")] public static var cLevelSelectOtherBoxL:Class;
  // [Embed(source="/resource/levelselect_box_other_M.png")] public static var cLevelSelectOtherBoxM:Class;
  // [Embed(source="/resource/levelselect_box_other_R.png")] public static var cLevelSelectOtherBoxR:Class;
  // [Embed(source="/resource/levelselect_checkbox_levels_A.png")] public static var cLevelSelectLevelCheckBoxA:Class;
  // [Embed(source="/resource/levelselect_checkbox_levels_B.png")] public static var cLevelSelectLevelCheckBoxB:Class;
  // [Embed(source="/resource/levelselect_starthere_text.png")] public static var cLevelSelectStartHereText:Class;
  // [Embed(source="/resource/levelselect_starthere_arrow.png")] public static var cLevelSelectStartHereArrow:Class;

  // // GUI window resources
  // [Embed(source="/resource/box120_top.png")] public static var cGuiWindowTop120:Class;
  // [Embed(source="/resource/box120_bot.png")] public static var cGuiWindowBottom120:Class;
  // [Embed(source="/resource/box120_mid.png")] public static var cGuiWindowMid120:Class;
  // [Embed(source="/resource/box154_top.png")] public static var cGuiWindowTop154:Class;
  // [Embed(source="/resource/box154_bot.png")] public static var cGuiWindowBottom154:Class;
  // [Embed(source="/resource/box154_mid.png")] public static var cGuiWindowMid154:Class;
  // [Embed(source="/resource/box200_top.png")] public static var cGuiWindowTop200:Class;
  // [Embed(source="/resource/box200_bot.png")] public static var cGuiWindowBottom200:Class;
  // [Embed(source="/resource/box200_mid.png")] public static var cGuiWindowMid200:Class;
  // [Embed(source="/resource/box248_top.png")] public static var cGuiWindowTop248:Class;
  // [Embed(source="/resource/box248_bot.png")] public static var cGuiWindowBottom248:Class;
  // [Embed(source="/resource/box248_mid.png")] public static var cGuiWindowMid248:Class;
  // [Embed(source="/resource/box547_top.png")] public static var cGuiWindowTop547:Class;
  // [Embed(source="/resource/box547_bot.png")] public static var cGuiWindowBottom547:Class;
  // [Embed(source="/resource/box547_mid.png")] public static var cGuiWindowMid547:Class;
  // [Embed(source="/resource/topbox_left.png")] public static var cGuiWindowLeft800:Class;
  // [Embed(source="/resource/topbox_right.png")] public static var cGuiWindowRight800:Class;
  // [Embed(source="/resource/topbox_mid.png")] public static var cGuiWindowMid800:Class;
  // [Embed(source="/resource/chall_ed_restrictions_box_L.png")] public static var cGuiWindowLeft600:Class;
  // [Embed(source="/resource/chall_ed_restrictions_box_R.png")] public static var cGuiWindowRight600:Class;
  // [Embed(source="/resource/chall_ed_restrictions_box_M.png")] public static var cGuiWindowMid600:Class;
  // [Embed(source="/resource/chall_ed_winloss_box_L.png")] public static var cGuiWindowLeft700:Class;
  // [Embed(source="/resource/chall_ed_winloss_box_R.png")] public static var cGuiWindowRight700:Class;
  // [Embed(source="/resource/chall_ed_winloss_box_M.png")] public static var cGuiWindowMid700:Class;
  // [Embed(source="/resource/chall_ed_winloss_box_linebox.png")] public static var cGuiWindowLinebox:Class;
  // [Embed(source="/resource/chall_ed_winloss_box_linehoriz.png")] public static var cGuiWindowLine:Class;

  // // Drop down menu resources
  // [Embed(source="/resource/menubar.png")] public static var cGuiMenuBar:Class;
  // [Embed(source="/resource/menubar_roll.png")] public static var cGuiMenuBarRoll:Class;
  // [Embed(source="/resource/menubox_chkboxA_base.png")] public static var cGuiMenuCheckBoxABase:Class;
  // [Embed(source="/resource/menubox_chkboxA_roll.png")] public static var cGuiMenuCheckBoxARoll:Class;
  // [Embed(source="/resource/menubox_chkboxA_click.png")] public static var cGuiMenuCheckBoxAClick:Class;
  // [Embed(source="/resource/menubox_chkboxB_base.png")] public static var cGuiMenuCheckBoxBBase:Class;
  // [Embed(source="/resource/menubox_chkboxB_roll.png")] public static var cGuiMenuCheckBoxBRoll:Class;
  // [Embed(source="/resource/menubox_chkboxB_click.png")] public static var cGuiMenuCheckBoxBClick:Class;

  // // GUI button resources
  // [Embed(source="/resource/button_red_base.png")] public static var cGuiButtonRedBase:Class;
  // [Embed(source="/resource/button_red_roll.png")] public static var cGuiButtonRedRoll:Class;
  // [Embed(source="/resource/button_red_click.png")] public static var cGuiButtonRedClick:Class;
  // [Embed(source="/resource/button_purple_base.png")] public static var cGuiButtonPurpleBase:Class;
  // [Embed(source="/resource/button_purple_roll.png")] public static var cGuiButtonPurpleRoll:Class;
  // [Embed(source="/resource/button_purple_click.png")] public static var cGuiButtonPurpleClick:Class;
  // [Embed(source="/resource/button_blue_base.png")] public static var cGuiButtonBlueBase:Class;
  // [Embed(source="/resource/button_blue_roll.png")] public static var cGuiButtonBlueRoll:Class;
  // [Embed(source="/resource/button_blue_click.png")] public static var cGuiButtonBlueClick:Class;
  // [Embed(source="/resource/button_pink_base.png")] public static var cGuiButtonPinkBase:Class;
  // [Embed(source="/resource/button_pink_roll.png")] public static var cGuiButtonPinkRoll:Class;
  // [Embed(source="/resource/button_pink_click.png")] public static var cGuiButtonPinkClick:Class;
  // [Embed(source="/resource/button_orange_base.png")] public static var cGuiButtonOrangeBase:Class;
  // [Embed(source="/resource/button_orange_roll.png")] public static var cGuiButtonOrangeRoll:Class;
  // [Embed(source="/resource/button_orange_click.png")] public static var cGuiButtonOrangeClick:Class;
  // [Embed(source="/resource/button_play_base.png")] public static var cGuiButtonPlayBase:Class;
  // [Embed(source="/resource/button_play_roll.png")] public static var cGuiButtonPlayRoll:Class;
  // [Embed(source="/resource/button_play_click.png")] public static var cGuiButtonPlayClick:Class;
  // [Embed(source="/resource/button_X_base.png")] public static var cGuiButtonXBase:Class;
  // [Embed(source="/resource/button_X_roll.png")] public static var cGuiButtonXRoll:Class;
  // [Embed(source="/resource/button_X_click.png")] public static var cGuiButtonXClick:Class;

  // // GUI Combo box resources
  // [Embed(source="/resource/button_purplearrow_base.png")] public static var cGuiComboboxBase:Class;
  // [Embed(source="/resource/button_purplearrow_roll.png")] public static var cGuiComboboxRoll:Class;
  // [Embed(source="/resource/button_purplearrow_click.png")] public static var cGuiComboboxClick:Class;

  // // GUI List box resources
  // [Embed(source="/resource/listboxentry_base.png")] public static var cGuiListboxBase:Class;
  // [Embed(source="/resource/listboxentry_roll.png")] public static var cGuiListboxRoll:Class;
  // [Embed(source="/resource/listboxentry_active.png")] public static var cGuiListboxClick:Class;
  // [Embed(source="/resource/listboxentry_wide_base.png")] public static var cGuiListboxWideBase:Class;
  // [Embed(source="/resource/listboxentry_wide_roll.png")] public static var cGuiListboxWideRoll:Class;
  // [Embed(source="/resource/listboxentry_wide_active.png")] public static var cGuiListboxWideClick:Class;

  // // GUI Scrollbar resources
  // [Embed(source="/resource/scrollbar_field.png")] public static var cGuiScrollbarField:Class;
  // [Embed(source="/resource/scrollbar_base.png")] public static var cGuiScrollbarBase:Class;
  // [Embed(source="/resource/scrollbar_roll.png")] public static var cGuiScrollbarRoll:Class;
  // [Embed(source="/resource/scrollbar_click.png")] public static var cGuiScrollbarClick:Class;
  // [Embed(source="/resource/scrollbar_tall_base.png")] public static var cGuiScrollbarTallBase:Class;
  // [Embed(source="/resource/scrollbar_tall_roll.png")] public static var cGuiScrollbarTallRoll:Class;
  // [Embed(source="/resource/scrollbar_tall_click.png")] public static var cGuiScrollbarTallClick:Class;
  // [Embed(source="/resource/button_arrowup_base.png")] public static var cGuiScrollbarButtonUpBase:Class;
  // [Embed(source="/resource/button_arrowup_roll.png")] public static var cGuiScrollbarButtonUpRoll:Class;
  // [Embed(source="/resource/button_arrowup_click.png")] public static var cGuiScrollbarButtonUpClick:Class;
  // [Embed(source="/resource/button_arrowdown_base.png")] public static var cGuiScrollbarButtonDownBase:Class;
  // [Embed(source="/resource/button_arrowdown_roll.png")] public static var cGuiScrollbarButtonDownRoll:Class;
  // [Embed(source="/resource/button_arrowdown_click.png")] public static var cGuiScrollbarButtonDownClick:Class;

  // // GUI Check box resources
  // [Embed(source="/resource/chkboxA_base.png")] public static var cGuiCheckboxABase:Class;
  // [Embed(source="/resource/chkboxA_roll.png")] public static var cGuiCheckboxARoll:Class;
  // [Embed(source="/resource/chkboxA_click.png")] public static var cGuiCheckboxAClick:Class;
  // [Embed(source="/resource/chkboxA_disabled.png")] public static var cGuiCheckboxADisabled:Class;
  // [Embed(source="/resource/chkboxB_base.png")] public static var cGuiCheckboxBBase:Class;
  // [Embed(source="/resource/chkboxB_roll.png")] public static var cGuiCheckboxBRoll:Class;
  // [Embed(source="/resource/chkboxB_click.png")] public static var cGuiCheckboxBClick:Class;
  // [Embed(source="/resource/chkboxB_disabled.png")] public static var cGuiCheckboxBDisabled:Class;

  // // GUI text area resources
  // [Embed(source="/resource/txtbox_base.png")] public static var cGuiTextAreaBase:Class;
  // [Embed(source="/resource/txtbox_roll.png")] public static var cGuiTextAreaRoll:Class;
  // [Embed(source="/resource/txtbox_base_disabled.png")] public static var cGuiTextAreaDisabled:Class;

  // // GUI Slider resources
  // [Embed(source="/resource/slider_groove.png")] public static var cGuiSliderGroove:Class;
  // [Embed(source="/resource/slider_groove_disabled.png")] public static var cGuiSliderGrooveDisabled:Class;

  // // Cloud resources
  // [Embed(source="/resource/cloud_0.png")] public static var cCloud0:Class;
  // [Embed(source="/resource/cloud_1.png")] public static var cCloud1:Class;
  // [Embed(source="/resource/cloud_2.png")] public static var cCloud2:Class;
  // [Embed(source="/resource/cloud_3.png")] public static var cCloud3:Class;
  // [Embed(source="/resource/cloud_4.png")] public static var cCloud4:Class;
  // [Embed(source="/resource/cloud_5.png")] public static var cCloud5:Class;
  // [Embed(source="/resource/cloud_6.png")] public static var cCloud6:Class;
  // [Embed(source="/resource/cloud_7.png")] public static var cCloud7:Class;
  // [Embed(source="/resource/cloud_8.png")] public static var cCloud8:Class;
  // [Embed(source="/resource/cloud_9.png")] public static var cCloud9:Class;

  // // Sounds
  // [Embed(source="/resource/roll_01.mp3")] public static var cRoll:Class;
  // [Embed(source="/resource/click_02.mp3")] public static var cClick:Class;
  // [Embed(source="/resource/create_shape_1.mp3")] public static var cShape1:Class;
  // [Embed(source="/resource/create_shape_2.mp3")] public static var cShape2:Class;
  // [Embed(source="/resource/create_shape_3.mp3")] public static var cShape3:Class;
  // [Embed(source="/resource/create_shape_4.mp3")] public static var cShape4:Class;
  // [Embed(source="/resource/create_shape_5.mp3")] public static var cShape5:Class;
  // [Embed(source="/resource/create_joint_1.mp3")] public static var cJoint1:Class;
  // [Embed(source="/resource/create_joint_2.mp3")] public static var cJoint2:Class;
  // [Embed(source="/resource/create_joint_3.mp3")] public static var cJoint3:Class;
  // [Embed(source="/resource/create_joint_4.mp3")] public static var cJoint4:Class;
  // [Embed(source="/resource/create_joint_5.mp3")] public static var cJoint5:Class;
  // [Embed(source="/resource/Incredibots_Intro.mp3")] public static var cIntro:Class;
  // [Embed(source="/resource/Incredibots_Win_r1.mp3")] public static var cWin:Class;
  // [Embed(source="/resource/Incredibots_Lose_r2.mp3")] public static var cLose:Class;
  // // Challenges
  // [Embed(source="/resource/race.dat", mimeType="application/octet-stream")] public static var cRace:Class;
  // [Embed(source="/resource/spaceship.dat", mimeType="application/octet-stream")] public static var cSpaceship:Class;
  // [Embed(source="/resource/robot.dat", mimeType="application/octet-stream")] public static var cRobot:Class;
  // [Embed(source="/resource/replay.dat", mimeType="application/octet-stream")] public static var cReplay:Class;
}
