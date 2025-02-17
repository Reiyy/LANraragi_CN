package LANraragi::Plugin::Metadata::RegexParse;

use strict;
use warnings;
use utf8;
#Plugins can freely use all Perl packages already installed on the system
#Try however to restrain yourself to the ones already installed for LRR (see tools/cpanfile) to avoid extra installations by the end-user.
use File::Basename;

use LANraragi::Model::Plugins;
use LANraragi::Utils::Database qw(redis_encode redis_decode);
use LANraragi::Utils::Logging  qw(get_plugin_logger);
use LANraragi::Utils::String   qw(trim);
use Scalar::Util               qw(looks_like_number);

my $PLUGIN_TAG_NS = 'parsed:';

my %COMMON_EXTRANEOUS_VALUES = (
    'uncensored' => 1,
    'decensored' => 1,
    'ongoing'    => 1,
    'pixiv'      => 1,
    'twitter'    => 1,
    'fanbox'     => 1,
    'cosplay'    => 1,
    'digital'    => 1
);

#Meta-information about your plugin.
sub plugin_info {

    return (
        #Standard metadata
        name        => "Filename Parsing",
        type        => "metadata",
        namespace   => "regexplugin",
        author      => "Difegue",
        version     => "1.2",
        description => "从给定档案的文件名中提取标签。<br><br>"
          . "默认遵循同人志命名标准\"(发布者) [作者] 标题 (系列) [语言]\"。<br><br>"
          . "通过启用下方插件设置，您可以扩展匹配文件名中的所有括号内容，"
          . "即使文件名不符合标准格式。<br>"
          . "非标准标签将关联至\"<i>${PLUGIN_TAG_NS}</i>\"命名空间，"
          . "你可以创建自己的标签规则进行管理。<br>"
          . "建议将规则\"<i>-${PLUGIN_TAG_NS}*</i>\"置于末位以清除冗余元素。",
        icon =>
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAL1JREFUOI1jZMABpNbH/sclx8DAwPAscDEjNnEMQUIGETIYhUOqYdgMhTPINQzdUEZqGIZsKBM1DEIGTOiuexqwCKdidDl0vtT62P9kuZCJEWuKYWBgYGBgRHbh04BFDNIb4jAUbbSrZTARUkURg6lD10OUC/0PNaMYgs1Skgwk1jCSDCQWoBg46dYmhite0+D8pwGLCMY6uotRDOy8toZBkI2HIhcO/pxCm8KBUkOxFl/kGoq3gCXFYFxVAACeoU/8xSNybwAAAABJRU5ErkJggg==",
        parameters => [
            {   type => "bool",
                desc =>
                  "若文件名以一对花括号{}结尾，则提取其中的内容作为基础标签列表，不附加\"${PLUGIN_TAG_NS}\"命名空间"
            },
            {   type => "bool",
                desc =>
                  "捕获圆括号内的所有内容，并将其关联至\"${PLUGIN_TAG_NS}\"命名空间下<BR />"
                  . "（需配合标签规则使用）"
            }
        ],
    );

}

#Mandatory function to be implemented by your plugin
sub get_tags {
    my ( undef, $lrr_info, $check_trailing_tags, $keep_all_captures ) = @_;

    # lrr_info's file_path is taken straight from the filesystem, which might not be proper UTF-8.
    # Run a decode to make sure we can derive tags with the proper encoding.
    my $file     = Mojo::File->new( redis_decode( $lrr_info->{'file_path'} ) );
    my $filename = $file->basename( '.' . $file->extname );

    my ( $tags, $title ) = parse_filename(
        $filename,
        {   'check_trailing_tags' => $check_trailing_tags,
            'keep_all_captures'   => $keep_all_captures
        }
    );

    my $logger = get_plugin_logger();
    $logger->info("Sending the following tags to LRR: $tags");
    $logger->info("Parsed title is $title");

    return ( tags => $tags, title => $title );
}

sub parse_filename {
    my ( $filename, $params ) = @_;

    my ( $event, $artist, $title, $series, $language, $trailing_tags, $other_captures );

    #Replace underscores with spaces
    $filename =~ s/_/ /g;

    #Use the regex on our file, and pipe it to the regexsel sub.
    $filename =~ &get_regex;

    #Take variables from the regex selection
    if ( defined $2 ) { $event    = $2; }
    if ( defined $4 ) { $artist   = $4; }
    if ( defined $5 ) { $title    = trim($5); }
    if ( defined $7 ) { $series   = $7; }
    if ( defined $9 ) { $language = $9; }
    my $tail = trim( $+{'tail'} );

    if ($tail) {

        # match trailing_tags (...{Tags}.ext)
        if ( $params->{'check_trailing_tags'} ) {
            $tail =~ /(?<head>.*)(\{(?<ttags>[^\}]*)\})$/;
            $trailing_tags = $+{'ttags'};
            $tail          = $+{'head'} if ($trailing_tags);
        }

        # match any remaining parenthesis
        if ( $tail && $params->{'keep_all_captures'} ) {
            my @items = ( $tail =~ /\(([^\)]+)\)|\{([^}]+)\}|\[([^\]]+)\]/g );
            $other_captures = join( ',', grep { trim($_) } @items );
        }
    }

    my @tags;

    push @tags, parse_artist_value($artist)                                           if ($artist);
    push @tags, "event:$event"                                                        if ($event);
    push @tags, parse_captured_value_for_namespace( $language, 'language:' )          if ($language);
    push @tags, parse_captured_value_for_namespace( $series, 'series:' )              if ($series);
    push @tags, parse_captured_value_for_namespace( $other_captures, $PLUGIN_TAG_NS ) if ($other_captures);
    push @tags, parse_captured_value_for_namespace( $trailing_tags, '' )              if ($trailing_tags);

    if ( !$params->{'keep_all_captures'} ) {
        @tags = grep { !m/^\Q$PLUGIN_TAG_NS/ } @tags;
    }

    return ( join( ", ", sort @tags ), trim($title) );
}

sub parse_artist_value {
    my ($artist) = @_;

    my @tags;

    #Special case for circle/artist sets:
    #If the string contains parenthesis, what's inside those is the artist name
    #the rest is the circle.
    if ( $artist =~ /(.*) \((.*)\)/ ) {
        push @tags, "group:$1";    # split group?
        $artist = $2;
    }
    push @tags, parse_captured_value_for_namespace( $artist, 'artist:' );

    return @tags;
}

sub parse_captured_value_for_namespace {
    my ( $capture, $namespace ) = @_;
    return map { _classify_item( trim($_), $namespace ) } split( m/,/, $capture );
}

sub _classify_item {
    my ( $item, $namespace ) = @_;

    # if the namespace is specified, we are able to exclude some common words,
    # otherwise we are dealing with simple tags
    if ( $namespace && $COMMON_EXTRANEOUS_VALUES{ lc $item } || looks_like_number($item) ) {
        return $PLUGIN_TAG_NS . $item;
    }
    return "${namespace}${item}";
}

#Regular Expression matching the E-Hentai standard: (Release) [Artist] TITLE (Series) [Language]
#Used in parsing.
#Stuff that's between unescaped ()s is put in a numbered variable: $1,$2,etc
#Parsing is only done the first time the file is found. The parsed info is then stored into Redis.
#Change this regex if you wish to use a different parsing for mass-addition of archives.

#()? indicates the field is optional.
#(\(([^([]+)\))? returns the content of (Release). Optional.
#(\[([^]]+)\])? returns the content of [Artist]. Optional.
#([^([]+) returns the title. Mandatory.
#(\(([^([)]+)\))? returns the content of (Series). Optional.
#(\[([^]]+)\])? returns the content of [Language]. Optional.
#(?<tail>.*)? returns everything that is out of E-Hentai standard for further processing. Optional.
#\s* indicates zero or more whitespaces.
my $regex = qr/(\(([^([]+)\))?\s*(\[([^]]+)\])?\s*([^([]+)\s*(\(([^([)]+)\))?\s*(\[([^]]+)\])?(?<tail>.*)?/;
sub get_regex { return $regex }

1;
