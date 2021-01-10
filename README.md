# IBJS

Early-stage project attempting to port the flash game [IncrediBots 2 CE](http://incredibots.com/if/game.php) to TypeScript and PIXI.js.

## IncrediBots Open Source README from the original developers of the Flash version

*Development environment instructions in what follows do not apply to the HTML5 version.*

## PLAYING THE GAME

Thank you for downloading IncrediBots!  Get ready to build, control, and share your
very own robot creations in a physics-based playground!

To run IncrediBots or IncrediBots2, simply open the file incredibots.html or
incredibots2.html in a web browser with flash player installed.

Enjoy!

## BUILDING FROM SOURCE

The source code for the IB1 and IB2 game clients are located in the src/Incredibots
and src/Incredibots2 subdirectories.  Open up the actionscript IDE of your choice
(I used Flex builder 3), and create a new project using the appropriate directory.
The main runnable application file should be set to Main.as, and I used the param
-default-frame-rate 30 as a compiler argument.  Also make sure to link to the
flGUI.swc library in the libs folder.  The source code contains a few [Embed]
statements, that I believe may only work with Flex builder, but other IDEs likely
have similar methods of linking to assets.

Once everything is set up and the project compiles properly, the IDE should create
a bin-debug folder (or something similar), containing the SWF and an HTML file that
embeds the SWF.  Now you'll be able to make changes to the code and see them
reflected in the built SWF!

## CLIENT SIDE CODE

I'll give a basic overview of the key classes in the client side code, in hopes of
making it clear how exactly everything works.  The main application class is Main.as,
which takes care of adding event listeners to the stage, and determining which
'Controller' class is active.  You can think of a controller as loosely representing
one type of 'screen.'  There's one for the main menu, and then one for the main game
screen, with subclasses for all the different types of main game screens (i.e 1
subclass per tutorial, 1 for sandbox mode, 1 for create challenge mode, etc.).  The
(unfortunately somewhat monolithic) class that handles most of the main robot editing
functionality is ControllerGame, which has methods for responding to all the buttons
and menu options that are available while editing a robot, as well as methods for
handling creating, deleting, selecting, moving, and editing robot parts.  The allParts
Array in ControllerGame represents the robot currently being worked on, as an Array
of Parts.  It also handles starting and stopping the Box2D simulation

The Parts package contains class definitions for each type of 'Part available when
building a robot.  i.e. Circle, Rectangle, Fixed Joint, Rotating Joint, Thrusters, etc.
Each instance of these classes contains all the data about that particular part, for
example, a RevoluteJoint has member variables for joint strength, speed, whether or
not the motor is enabled, control keys, which 2 shape parts it's attached to, etc.
In the code, a 'Robot' or a 'Challenge' can be thought of as just an array of parts
with a bit of metadata attached (i.e. sandbox settings, challenge restrictions).

The Actions package simply contains a list of actions that can be performed by the
user when in edit mode.  These actions are used solely by the 'Undo' and 'Redo'
features, and each action knows what needs to be done to undo or redo it.

The Input class handles all keyboard and mouse interactions with non-GUI elements,
and dispatches calls to the appropriate methods (usually in ControllerGame) to
respond to a given mouse click or key press.

The Draw class deals with the drawing of robots to the screen.  There are 2 cases
it needs to deal with: edit mode, and simulation mode.  When in edit mode, it draws
all the shapes to the screen based on the current Array of Parts.  When in sim mode,
it draws the shapes based on the positioning of the Box2D representation of those
parts, but it needs to make them look the same in both cases.  In theory, this class
is pretty modular, and should be able to be swapped out with an alternate class used
for drawing to the screen fairly easily, in the event that you'd like to write your
own methods for dealing with robot graphics.

The Gui package has a bunch of classes that build the various GUI panels and windows
throughout the game.  The most important of these is probably the SaveLoadWindow
class, which handles displaying a list of robots available for load from the server.
It also handles high scores, saving and loading robots, replays, and challenges, and
searching for robots and such.  It's currently disabled, since the servers are going
down, but if another server ever goes up, this class will have to be modified.  Other
classes in this package include GuiWindow, which is the base class for all the little
popup dialogs throughout the game, and components such as GuiButton, GuiTextArea, etc.

Finally, the Database class handles all interactions with the server.  It has operations
for saving and loading robots and replays, as well as for getting lists of each of
these, and for logging in, creating a new user, uploading/downloading scores, and a few
more.  Each operation has a corresponding callback function, which processes the result
returned by the server and returns the data back to the appropriate class for display.
Of note are the functions PutXIntoByteArray and ExtractXFromByteArray, where X is one
of 'Robot', 'Replay', or 'Challenge'.  These functions are used to read and write in-game
data to or from a flash ByteArray.  The robot, replay, or challenge is then sent to the
server as the POST data part of a URLRequest.  These functions are also used by the
'Import' and 'Export' features, as an easy way of converting between in-game objects and
text.  If you want to add features that need to be saved along with a robot, replay, or
challenge, you'll most likely need to put them in to one of these functions explicitly.

## SERVER SIDE CODE

The server code is everything contained within the htdocs subfolder.  It's written
entirely in PHP.  I'll talk about the database server code first.

The database code is in the ./src/htdocs/incredibots[1 or 2]/database/ directory.
IncrediBots was build using Amazon S3 and SimpleDB as backends.  You can read more
about these at [http://aws.amazon.com](http://aws.amazon.com) .  Most of the DB server code is written
specifically with this in mind, and unfortunately I never got around to refactoring
it such that the database layer is abstracted within a common package.  Thus it may
be a lot of work to switch to something like MySQL, although it would work just as
well as SimpleDB and S3 if properly maintained.

Note that IncrediBots also makes use of MySQL through the PHPBB forums database.
Because we had a single login for both the game and the forums, all user accounts
are managed through the forums' phpbb_users table.  This is why the PHPBB forums
code is included in the package, I had to make a few modifications to the forums
code to get the single login working, as well as a few other features, such as the
ability to embed robots within forum posts.  That said, basic login and creating new
accounts should work just fine with any version of phpbb running, and it shouldn't be
too difficult to change the login functionality to work with whatever database/system
you want.

The current database code should work fine out of the box with any Amazon AWS account.
The only things that should need modifying are the credentials in the file
common_variables.php.  Apart from that, each ggscores_*.php file corresponds to one
of the 20 or so DB operations the client can call.  All calls are initially directed
to ggscores.php, which includes the proper file corresponding to the 'op' parameter.
Each operation then talks to the Amazon database (or phpbb_users table in MySQL) and
echos out a response for the client.  The binary data for all robots, replays, and
challenges is sent to the server via HTTP POST data, and are saved in S3 as BLOBs,
with a small amount of metadata for each stored in SimpleDB.

NOTE: One thing it may be a good idea to add is an MD5 checksum validation when
sending the binary data from the client to the server, to guard against packet
corruption.  I know this has happened in the past a few times, and when it does, the
affected robot/replay/challenge becomes corrupt, and is lost forever...  (Dun dun dun!)

The rest of the server code contains mostly components of the IncrediBots website.
The index.php page contains code to embed the SWF and display it properly.  In order
to host a SWF, you would just upload the SWF file that results from building the
client, named incredibots.swf (or incredibots2.swf) to the same directory as index.php.
The users.php page is also here, which displays all robots, replays, and challenges
uploaded by a given user in a (somewhat) nicely formatted webpage.

## ABOUT

IncrediBots was originally designed by Ryan Clark, programmed by Oliver Trujillo,
with art from Matt Parry.  A big amount of credit should also go to Erin Catto and
the Box2D physics engine, as well as the Flash port of it upon which our game is
built.
[http://www.box2d.org/](http://www.box2d.org/)
[http://box2dflash.sourceforge.net/](http://box2dflash.sourceforge.net/)

> IncrediBots is probably the game I've had the most fun working on.  It's been a
> blast checking out all the crazy creations made by the IncrediBots community, and I
> wish you all the best in keeping IncrediBots going.  Cheers and happy bot building!
> - Oliver
