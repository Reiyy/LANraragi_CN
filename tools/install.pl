#!/usr/bin/env perl

use strict;
use warnings;
use utf8;
use open ':std', ':encoding(UTF-8)';
use Cwd;
use Config;

use feature    qw(say);
use File::Path qw(make_path);

#Vendor dependencies
my @vendor_css = (
    "/blueimp-file-upload/css/jquery.fileupload.css",      "/\@fortawesome/fontawesome-free/css/all.min.css",
    "/jqcloud2/dist/jqcloud.min.css",                      "/react-toastify/dist/ReactToastify.min.css",
    "/jquery-contextmenu/dist/jquery.contextMenu.min.css", "/tippy.js/dist/tippy.css",
    "/allcollapsible/dist/css/allcollapsible.min.css",     "/awesomplete/awesomplete.css",
    "/\@jcubic/tagger/tagger.css",                         "/swiper/swiper-bundle.min.css",
    "/sweetalert2/dist/sweetalert2.min.css",
);

my @vendor_js = (
    "/blueimp-file-upload/js/jquery.fileupload.js",       "/blueimp-file-upload/js/vendor/jquery.ui.widget.js",
    "/datatables.net/js/jquery.dataTables.min.js",        "/jqcloud2/dist/jqcloud.min.js",
    "/jquery/dist/jquery.min.js",                         "/react-toastify/dist/react-toastify.umd.js",
    "/jquery-contextmenu/dist/jquery.ui.position.min.js", "/jquery-contextmenu/dist/jquery.contextMenu.min.js",
    "/tippy.js/dist/tippy-bundle.umd.min.js",             "/\@popperjs/core/dist/umd/popper.min.js",
    "/allcollapsible/dist/js/allcollapsible.min.js",      "/awesomplete/awesomplete.min.js",
    "/\@jcubic/tagger/tagger.js",                         "/marked/marked.min.js",
    "/swiper/swiper-bundle.min.js",                       "/preact/dist/preact.umd.js",
    "/clsx/dist/clsx.min.js",                             "/preact/compat/dist/compat.umd.js",
    "/preact/hooks/dist/hooks.umd.js",                    "/sweetalert2/dist/sweetalert2.min.js",
    "/fscreen/dist/fscreen.esm.js"
);

my @vendor_woff = (
    "/\@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2",
    "/\@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2",
    "/geist/dist/fonts/geist-sans/Geist-Regular.woff2",
    "/geist/dist/fonts/geist-sans/Geist-SemiBold.woff2",
    "/inter-ui/Inter (web)/Inter-Regular.woff",
    "/inter-ui/Inter (web)/Inter-Bold.woff",
);

say("⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⣠⣴⣶⣿⠿⠟⠛⠓⠒⠤");
say("⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⣠⣾⣿⡟⠋");
say("⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢰⣿⣿⠋");
say("⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⢀⣿⣿⠇⡀");
say("⢀⢀⢀⢀⢀⢀⢀⢀⢀⣀⣤⡆⢿⣿⢀⢿⣷⣦⣄⣀");
say("⢀⢀⢀⢀⢀⢀⢀⣶⣿⠿⠛⠁⠈⢻⡄⢀⠈⠙⠻⢿⣿⣆");
say("⢀⢀⢀⢀⢀⢀⢸⣿⣿⣶⣤⣀⢀⢀⢀⢀⢀⣀⣤⣶⣿⣿");
say("⢀⢀⢀⢀⢀⢀⢸⣿⣿⣿⣿⣿⣿⣶⣤⣶⣿⠿⠛⠉⣿⣿");
say("⢀⢀⢀⢀⢀⢀⢸⣿⣿⣿⣿⣿⣿⣿⣿⠉⢀⢀⢀⢀⣿⣿");
say("⢀⢀⢀⢀⣀⣤⣾⣿⣿⣿⣿⣿⣿⣿⣿⢀⢀⢀⣠⣴⣿⣿⣦⣄⡀");
say("⢀⣤⣶⣿⠿⠟⠉⢀⠉⠛⠿⣿⣿⣿⣿⣴⣾⡿⠿⠋⠁⠈⠙⠻⢿⣷⣦⣄");
say("⣿⣿⣯⣅⢀⢀⢀⢀⢀⢀⢀⣀⣭⣿⣿⣿⣍⡀⢀⢀⢀⢀⢀⢀⢀⣨⣿⣿⡇");
say("⣿⣿⣿⣿⣿⣶⣤⣀⣤⣶⣿⡿⠟⢹⣿⣿⣿⣿⣷⣦⣄⣠⣴⣾⡿⠿⠋⣿⡇");
say("⣿⣿⣿⣿⣿⣿⣿⣿⡟⠋⠁⢀⢀⢸⣿⣿⣿⣿⣿⣿⣿⣿⠛⠉⢀⢀⢀⣿⡇");
say("⣿⣿⣿⣿⣿⣿⣿⣿⡇⢀⢀⢀⢀⣸⣿⣿⣿⣿⣿⣿⣿⣿⢀⢀⢀⢀⢀⣿⡇");
say("⠙⢿⣿⣿⣿⣿⣿⣿⡇⢀⣠⣴⣿⡿⠿⣿⣿⣿⣿⣿⣿⣿⢀⣀⣤⣾⣿⠟⠃");
say("⢀⢀⠈⠙⠿⣿⣿⣿⣷⣿⠿⠛⠁⢀⢀⢀⠉⠻⢿⣿⣿⣿⣾⡿⠟⠉");
say("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
say("~~~~~LANraragi 安装程序~~~~~");
say("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

unless ( @ARGV > 0 ) {
    say("执行：npm run lanraragi-installer [模式]");
    say("--------------------------");
    say("可用模式有: ");
    say("* install-front: 安装/更新客户端依赖。");
    say("* install-back: 安装/更新 Perl 依赖。");
    say("* install-full: 安装/更新所有依赖项");
    say("");
    say("如果从源代码安装，请使用 install-full 模式。");
    exit;
}

my $front  = $ARGV[0] eq "install-front";
my $back   = $ARGV[0] eq "install-back";
my $full   = $ARGV[0] eq "install-full";
my $legacy = $ARGV[1] eq "legacy";

say( "工作目录: " . getcwd );
say("");

# Provide cpanm with the correct module installation dir when using Homebrew
my $cpanopt = "";
if ( $ENV{HOMEBREW_FORMULA_PREFIX} ) {
    $cpanopt = " -l " . $ENV{HOMEBREW_FORMULA_PREFIX} . "/libexec";
}

#Load IPC::Cmd
install_package( "IPC::Cmd",         $cpanopt );
install_package( "Config::AutoConf", $cpanopt );
IPC::Cmd->import('can_run');
require Config::AutoConf;

say("\r\n现在将检查所有依赖项是否满足运行LRR软件。\r\n");

#Check for Redis
say("正在检查 Redis...");
can_run('redis-server')
  or die '未找到！请在继续之前安装 Redis 服务器。';
say("完成！");

#Check for GhostScript
say("正在检查 GhostScript...");
can_run('gs')
  or warn '未找到！PDF功能将无法正常工作。请安装“gs”工具。';
say("完成！");

#Check for libarchive
say("C正在检查 libarchive...");
Config::AutoConf->new()->check_header("archive.h")
  or die 'NOT FOUND! Please install libarchive and ensure its headers are present.';
say("完成！");

#Check for PerlMagick
say("Checking for ImageMagick/PerlMagick...");
my $imgk;

eval {
    require Image::Magick;
    $imgk = Image::Magick->QuantumDepth;
};

if ($@) {
    say("NOT FOUND");
    say("Please install ImageMagick with Perl for thumbnail support.");
    say("Further instructions are available at https://www.imagemagick.org/script/perl-magick.php .");
    say("The ImageMagick detection command returned: $imgk -- $@");
} else {
    say( "Returned QuantumDepth: " . $imgk );
    say("OK!");
}

#Build & Install CPAN Dependencies
if ( $back || $full ) {
    say("\r\nInstalling Perl modules... This might take a while.\r\n");

    if ( $Config{"osname"} ne "darwin" ) {
        say("Installing Linux::Inotify2 for non-macOS systems... (This will do nothing if the package is there already)");

        install_package( "Linux::Inotify2", $cpanopt );
    }

    if ( system( "cpanm --installdeps ./tools/. --notest" . $cpanopt ) != 0 ) {
        die "Something went wrong while installing Perl modules - Bailing out.";
    }
}

#Clientside Dependencies with Provisioning
if ( $front || $full ) {

    say("\r\nObtaining remote Web dependencies...\r\n");

    my $npmcmd = $legacy ? "npm install" : "npm ci";
    if ( system($npmcmd) != 0 ) {
        die "Something went wrong while obtaining node modules - Bailing out.";
    }

    say("\r\nProvisioning...\r\n");

    #Load File::Copy
    install_package( "File::Copy", $cpanopt );
    File::Copy->import("copy");

    make_path getcwd . "/public/css/vendor";
    make_path getcwd . "/public/css/webfonts";
    make_path getcwd . "/public/js/vendor";

    for my $css (@vendor_css) {
        cp_node_module( $css, "/public/css/vendor/" );
    }

    #Rename the fontawesome css to something a bit more explanatory
    copy( getcwd . "/public/css/vendor/all.min.css", getcwd . "/public/css/vendor/fontawesome-all.min.css" );

    for my $js (@vendor_js) {
        cp_node_module( $js, "/public/js/vendor/" );
    }

    for my $woff (@vendor_woff) {
        cp_node_module( $woff, "/public/css/webfonts/" );
    }

}

#Done!
say("\r\nAll set! You can start LANraragi by typing the command: \r\n");
say("   ╭─────────────────────────────────────╮");
say("   │                                     │");
say("   │              npm start              │");
say("   │                                     │");
say("   ╰─────────────────────────────────────╯");

sub cp_node_module {

    my ( $item, $newpath ) = @_;

    my $nodename = getcwd . "/node_modules" . $item;
    $item =~ /([^\/]+$)/;
    my $newname     = getcwd . $newpath . $&;
    my $nodemapname = $nodename . ".map";
    my $newmapname  = $newname . ".map";

    say("\r\nCopying $nodename \r\n to $newname");
    copy( $nodename, $newname ) or die "The copy operation failed: $!";

    my $mapresult = copy( $nodemapname, $newmapname ) and say("Copied sourcemap file.\r\n");

}

sub install_package {

    my $package = $_[0];
    my $cpanopt = $_[1];

    ## no critic
    eval "require $package";    #Run-time evals are needed here to check if the package has been properly installed.
    ## use critic

    if ($@) {
        say("$package not installed! Trying to install now using cpanm$cpanopt");
        system("cpanm $package $cpanopt");
    } else {
        say("$package package installed, proceeding...");
    }
}
