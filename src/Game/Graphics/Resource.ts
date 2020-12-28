import PIXIsound from 'pixi-sound'
import cIntro from '../../../resource/Incredibots_Intro.mp3'

export class MouseCursor {
    // Css style for icons
    defaultIcon = "url('resource/mouse_pointer.png'),auto";
    hoverIcon = "url('resource/mopuse_hourglass.png'),auto";

    apply(application) {
        // Add custom cursor styles
        application.renderer.plugins.interaction.cursorStyles.default = this.defaultIcon;
        application.renderer.plugins.interaction.cursorStyles.hover = this.hoverIcon;
    }
}

export class Resource {
    static cIntro = PIXIsound.Sound.from(cIntro)

    static paths = {
        'cReplay': 'resource/replay.dat'
    }

    static data = {}
	static cReplay: any;
	static cRobot: any;
	static cMainMenuLogo: any;
	static cLevelSelectBox1L: any;
	static cLevelSelectBox1R: any;
	static cLevelSelectBox1M: any;
	static cLevelSelectBox2L: any;
	static cLevelSelectBox2R: any;
	static cLevelSelectBox2M: any;
	static cLevelSelectOtherBoxL: any;
	static cLevelSelectOtherBoxR: any;
	static cLevelSelectOtherBoxM: any;
	static cLevelSelectStartHereArrow: any;
	static cLevelSelectStartHereText: any;

    static async load() {
        for (const key in Resource.paths) {
            Resource[key] = await fetch(Resource.paths[key]).then(res => res.blob())
        }
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
