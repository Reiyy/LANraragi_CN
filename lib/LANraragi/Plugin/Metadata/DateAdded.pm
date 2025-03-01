package LANraragi::Plugin::Metadata::DateAdded;

use strict;
use warnings;
use utf8;
#Plugins can freely use all Perl packages already installed on the system
#Try however to restrain yourself to the ones already installed for LRR (see tools/cpanfile) to avoid extra installations by the end-user.
use Mojo::UserAgent;

use LANraragi::Model::Plugins;
use LANraragi::Utils::Logging qw(get_logger);

#Meta-information about your plugin.
sub plugin_info {

    return (
        #Standard metadata
        name      => "Add Timestamp Tag",
        type      => "metadata",
        namespace => "DateAddedPlugin",
        author    => "Utazukin",
        version   => "1.0",
        description =>
          "将时间戳标签添加到你的档案。<br> 该插件遵循服务器设置的时间戳标签，如果服务器设置为“使用最后修改时间”，则将使用文件的修改时间。",
        icon =>
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA\nB3RJTUUH4wYCFQY4HfiAJAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUH\nAAADKUlEQVQ4y6WVsUtrVxzHP+fmkkiqJr2CQWKkvCTwJgkJDpmyVAR1cVOhdq04tHNB7BD8A97S\nXYkO3dRRsMSlFoIOLYFEohiDiiTNNeaGpLn5dRDv06ev75V+4SyH8/2c3/n+zuEoEeFTqtfrb5RS\nJZ/P98m1iMirI5fLMT8/L+FwWEKhkIRCIXn79q2srKxIpVL5qE/7cINms8ny8rIkEgkpl8skk0lm\nZ2eZmZkhHo+TzWYJBoOyvr4u7Xb7RYHq6ZEvLi6Ynp6WVqvFwsIC4+PjRCIRDMNAKcXNzQ2lUols\nNsvOzg6xWIxMJqOeRuEAq9UqqVRKhoaGmJubY2pqCl3XiUajXF5e0t/fz+DgIIVCAbfbzdbWFtvb\n24yMjLC/v6+eZWjbNqurq5JIJGRtbU0syxLbtsU0TXmqXq8njUZDRERubm4knU6LYRiSyWScDBER\nGo0G4XBYFhcX5fz8XP4yTbGLf0hnd0s+plqtJru7u7K0tCSRSEQ6nc77ppycnFCv10kmk4yOjoII\n2kiIv3//lfbGu1dvh1KKVCrF2NgYmqaRy+UAHoCHh4f4fD4mJiZwuVz4fT74YhDvTz/TPv2TX378\ngWKx+Azo9/sZGBhAKYVhGBSLxa8doGmaABiGQT6fp9VqPbg0jcr897w7+I3FxUVs23aAlmVxe3tL\nPB7n/v6eWq22D6A/lq+UotlsEo1G8Xg8jvFNOMzCN99iGF/icrmc+b6+PrxeL6enp7hcLpR6aLT+\nuEDTNEqlErFYDMuy8Hq9AHg8HpaXv3uRYbfbRdM0TNNE096/Dweo6zoHBwfE43F0XXeAjyf4UJVK\nhUql8iwGJ8NHeb1e9vb2CAaDADQajRcgy7IACAQCHB0d/TtQ0zQuLi7Y3Nzk+vqacrkMwNXVFXd3\nd7Tbbc7Ozuh0OmxsbHB1dfViQ/21+3V8fIxpmkxOTmKaJrZt0263sW0b27ZJp9M0m010XX8RhwN8\nNPV6PQCKxSL5fB7DMAgEAnS7XarVKtVqFbfbjVIK27ZRSjkeB9jtdikUChQKBf6vlIg4Gb3Wzc/V\n8PDwV36//1x9zhfwX/QPryPQMvGWTdEAAAAASUVORK5CYII=",
        parameters => [],
        oneshot_arg =>
          "使用文件修改时间（yes/true）或当前时间（no/false）。留空则沿用服务器设置（默认：当前时间）"
    );

}

#Mandatory function to be implemented by your plugin
sub get_tags {

    shift;
    my $lrr_info = shift;                                               # Global info hash
    my ($use_filetime) = LANraragi::Model::Config->use_lastmodified;    # Server setting

    #Use the logger to output status - they'll be passed to a specialized logfile and written to STDOUT.
    my $logger = get_logger( "Date Added Plugin", "plugins" );

    #Work your magic here - You can create subroutines below to organize the code better

    $logger->debug( "Processing file: " . $lrr_info->{file_path} );
    my $newtags              = "";
    my $oneshotarg           = $lrr_info->{oneshot_param};
    my $oneshot_file_time    = $oneshotarg =~ /^(yes|true)$/i;
    my $oneshot_current_time = $oneshotarg =~ /^(no|false)$/i;

    if ( $oneshot_file_time || ( $use_filetime && !$oneshot_current_time ) ) {
        $logger->info("使用文件日期");
        $newtags = "date_added:" . ( stat( $lrr_info->{file_path} ) )[9];    #9 is the unix time stamp for date modified.
    } else {
        $logger->info("使用当前日期");
        $newtags = "date_added:" . time();
    }
    return ( tags => $newtags );
}

1;

